const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

function genCode(){
  // KeFo + 6 digits
  const n = Math.floor(100000 + Math.random() * 900000);
  return `KeFo${n}`;
}

async function isDeveloper(uid){
  const snap = await db.doc(`users/${uid}`).get();
  return snap.exists && snap.data().role === "developer";
}

exports.approveAccountRequest = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");
  const uid = context.auth.uid;
  if (!(await isDeveloper(uid))) throw new functions.https.HttpsError("permission-denied", "Developer only.");

  const { requestId, password } = data || {};
  if (!requestId) throw new functions.https.HttpsError("invalid-argument", "requestId required.");
  if (!password || String(password).length < 6) throw new functions.https.HttpsError("invalid-argument", "Weak password.");

  const ref = db.doc(`account_requests/${requestId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new functions.https.HttpsError("not-found", "Request not found.");

  const req = snap.data();
  if (req.status !== "pending") throw new functions.https.HttpsError("failed-precondition", "Request is not pending.");

  // Generate unique code
  let code = genCode();
  // very small collision risk; loop a few times
  for (let i=0;i<5;i++){
    const existing = await db.collection("users").where("code","==",code).limit(1).get();
    if (existing.empty) break;
    code = genCode();
  }

  const email = `${code}@school.local`;

  // Create Auth user
  const userRecord = await admin.auth().createUser({
    email,
    password: String(password),
    displayName: req.displayName || code,
    disabled: false
  });

  // Create profile
  await db.doc(`users/${userRecord.uid}`).set({
    code,
    role: req.role,
    displayName: req.displayName || code,
    photoURL: req.photoURL || "",
    schoolId: req.schoolId || "default",
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Mark request approved
  await ref.update({
    status: "approved",
    decidedAt: admin.firestore.FieldValue.serverTimestamp(),
    decidedBy: uid,
    approvedUid: userRecord.uid,
    approvedCode: code
  });

  return { ok: true, uid: userRecord.uid, code };
});

exports.rejectAccountRequest = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");
  const uid = context.auth.uid;
  if (!(await isDeveloper(uid))) throw new functions.https.HttpsError("permission-denied", "Developer only.");

  const { requestId } = data || {};
  if (!requestId) throw new functions.https.HttpsError("invalid-argument", "requestId required.");

  const ref = db.doc(`account_requests/${requestId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new functions.https.HttpsError("not-found", "Request not found.");

  await ref.update({
    status: "rejected",
    decidedAt: admin.firestore.FieldValue.serverTimestamp(),
    decidedBy: uid
  });

  return { ok: true };
});

exports.addVote = functions.https.onCall(async (data, context) => {
  // يمكن لاحقاً منع التصويت المكرر per user، الآن MVP بسيط
  const { targetUid, kind, schoolId } = data || {};
  if (!targetUid) throw new functions.https.HttpsError("invalid-argument", "targetUid required.");
  if (!["teacher","student"].includes(kind)) throw new functions.https.HttpsError("invalid-argument", "kind invalid.");

  const col = kind === "teacher" ? "votes_teachers" : "votes_students";
  const ref = db.doc(`${col}/${targetUid}`);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const prev = snap.exists ? (snap.data().count || 0) : 0;
    tx.set(ref, {
      count: prev + 1,
      schoolId: schoolId || "default",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge:true });
  });

  return { ok:true };
});

// Scheduled leaderboard update: every hour
exports.updateLeaderboards = functions.pubsub
  .schedule("every 60 minutes")
  .timeZone("Europe/Berlin")
  .onRun(async () => {

    const schoolId = "default";

    async function top3Votes(colName){
      const qs = await db.collection(colName)
        .where("schoolId","==",schoolId)
        .orderBy("count","desc")
        .limit(3)
        .get();

      const out = [];
      for (const d of qs.docs){
        const v = d.data();
        const u = await db.doc(`users/${d.id}`).get();
        const ud = u.exists ? u.data() : {};
        out.push({
          uid: d.id,
          displayName: ud.displayName || "—",
          photoURL: ud.photoURL || "",
          count: v.count || 0
        });
      }
      return out;
    }

    const teachersTop = await top3Votes("votes_teachers");
    const studentsTop = await top3Votes("votes_students");

    await db.doc(`leaderboards/${schoolId}`).set({
      teachersTop,
      studentsTop,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge:true });

    return null;
  });
