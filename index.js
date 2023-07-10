const express = require("express");
const app = express();
const admin = require('firebase-admin');
require('dotenv').config()

admin.initializeApp({
    credential: admin.credential.cert({
        "type": "service_account",
        "project_id": process.env.PROJECT_ID,
        "private_key_id": process.env.PIRVATE_KEY_ID,
        "private_key": process.env.PRIVATE_KEY,
        "client_email": process.env.CLIENT_EMAIL,
        "client_id": process.env.CLIENT_ID,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": process.env.X509_CERT_URL,
        "universe_domain": "googleapis.com"
    })
});
const db = admin.firestore();

app.use(express.json());

app.get("/api/list", async (_, res) => {
    let applications = [];

    const byCollectionRef = db.collection('ez');
    const snapshot = await byCollectionRef.get();
    snapshot.forEach(doc => {
        applications.push({
            id: doc.id,
            ...doc.data()
        });
    });

    res.send(applications);
});

app.post('/api/create', async function (req, res) {
    const payload = {
        "from": req.body.from || null,
        "to": req.body.to || null,
        "username": req.body.username || null,
        "tel": req.body.tel || null,
        "admission": req.body.admission || null,
        "delivery": req.body.delivery || null,
        "comment": req.body.comment || null,
        "lang": req.body.lang || null,
        "email": req.body.email || null,
        "car": req.body.car || null,
    };

    if (
        !req.body.from ||
        !req.body.to ||
        !req.body.car ||
        !req.body.username ||
        !req.body.tel
    ) {
        return res.status(400).send('One of the required fields is empty');
    }

    const id = db.collection('ez').doc().id;
    const byCollectionRef = db.collection('ez');
    await byCollectionRef.doc(id).set(payload);

    res.status(200).send(req.body);
})

app.listen(process.env.PORT || 80, async() => {
    console.log('Started on port', process.env.PORT || 80)
})
