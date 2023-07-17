const express = require("express");
const app = express();
const admin = require('firebase-admin');
const moment = require('moment');
const cors = require('cors')
require('dotenv').config()
const XlsxPopulate = require('xlsx-populate');
var convertapi = require('convertapi')('BpMFm93JuS1vLLrV');
const fs = require('fs');

app.use(cors())
app.use(express.json());

const DOCUMENTS_KEY = 'documents';
const getPayloadLocations = (inputData) => {
    const {
      delivery,
      admission,
      customdelivery,
      customadmission
    } = inputData;
  
    const deliveryText = delivery === 3
      ? customdelivery
      : LOCATIONS_MAP[delivery];
    const admissionText = admission === 3
      ? customadmission
      : LOCATIONS_MAP[admission];
  
    return {
      delivery: deliveryText,
      admission: admissionText
    };
  };
const carMap = {
    1: 'TOYOTA RAV4 AWD',
    2: 'KIA SPORTAGE AWD',
    3: 'CITROEN C4',
    4: 'CHEVROLET ORLANDO 7 seats',
    10: 'VOLKSWAGEN TIGUAN',
    11: '',
    12: 'OPEL GRANDLAND X',
    13: 'KIA SPORTAGE AWD',
    14: 'TOYOTA RAV4 AWD',
    15: 'OPEL GRANDLAND X',
    16: 'VOLKSWAGEN PASSAT B8',
    17: 'FORD EXPLORER 7 seats',
    18: 'FORD EXPLORER 7 seats',
    19: 'OPEL ZAFIRA 7 seats',
    20: 'HYNDAI TUCSON N LINE AWD',
    22: '',
    23: 'INFINITI Q30',
    24: 'INFINITI Q30',
    25: 'LAND ROVER RANGE ROVER SPORT',
    26: 'KIA SPORTAGE AWD',
    27: 'KIA SPORTAGE AWD',
    28: 'PORSCHE CAYENNE COUPE',
    29: 'MERCEDES-BENZ GLE COUPE',
    30: 'BMW X4 X-DRIVE',
    31: 'CITROEN C4',
    32: 'TOYOTA COROLLA HYBRID',
    33: 'TOYOTA COROLLA',
    34: 'TOYOTA COROLLA CROSS HYBRID',
    35: 'TOYOTA COROLLA CROSS AWD',
    36: 'AUDI A7 Sportback',
    37: 'BMW 7 LONG',
    38: 'SKODA KODIAQ',
    39: 'SKODA KODIAQ',
    40: 'DODGE JOURNEY 7 seats'
};

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

const convertToPdf = async (id) => {
    const x = convertapi.convert('pdf', {
        File: `./xlsx/${id}.xlsx`,
        WorksheetIndex: 2
    }, 'xls').then(function(result) {
        const y = result.saveFiles('./pdf/');

        return y;
    });

    return x;
};

app.post("/downloadPdfById", async (req, res) => {
    const name = `${req.body.contractNumber.replace("/", "-")}`;
    const path = `./pdf/${name}.pdf`;
    try {
        if (fs.existsSync(path)) {
            res.download(path);
        } else {
            res.sendStatus(404);
        }
    } catch(err) {
        res.sendStatus(404);
    }
});

app.post('/pdf', (req, res) => {
    const {
        contractNumber,
        from,
        to,
        delivery,
        admission
    } = req.body;

    const name = `${contractNumber.replace("/", "-")}`;
    const x = XlsxPopulate.fromFileAsync("./template.xlsx")
        .then(workbook => {
            // dates/locations
            workbook.sheet(0).cell("C2").value(contractNumber);
            workbook.sheet(0).cell("C3").value(from);
            workbook.sheet(0).cell("C4").value(to);
            workbook.sheet(0).cell("C5").value(delivery);
            workbook.sheet(0).cell("C6").value(admission);

            return workbook.toFileAsync(`./xlsx/${name}.xlsx`);
        });

    x.then(_ => {
        convertToPdf(name).then(_ => res.sendStatus(200))
    })
})

app.post('/api/create', async function (req, res) {
    const payload = {
        "from": moment(req.body.from, 'YYYY-MM-DD').format('DD.MM.YYYY') || null,
        "to": moment(req.body.to, 'YYYY-MM-DD').format('DD.MM.YYYY') || null,
        "username": req.body.username || null,
        "tel": req.body.tel || null,
        "admission": req.body.admission || null,
        "delivery": req.body.delivery || null,
        "comment": req.body.comment || null,
        "lang": req.body.lang || null,
        "email": req.body.email || null,
        "car": carMap[req.body.car] || req.body.car || null,
        "carId": req.body.car || null,
        "status": "created"
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

    const byCollectionRef = db.collection('ez');
    let applications = [];
    const snapshot = await byCollectionRef.get();
    snapshot.forEach(doc => {
        applications.push({
            id: doc.id,
            ...doc.data()
        });
    });
    const id = applications.length;
    await byCollectionRef.doc(id.toString()).set({
        ...payload,
        id
    });

    res.status(200).send(payload);
})

app.post('/api/createDoc', async function (req, res) {
    console.log(req.body)
    const payload = {
        ...req.body,
        "carModel": carMap[req.body.carId] || req.body.carId || null,
        "carMaxSpeed": 130 || null,
        "otherDeposit": 300 || null,
        "otherFuelLevel": '100%' || null,
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

    const byCollectionRef = db.collection(DOCUMENTS_KEY);
    let documents = [];
    const snapshot = await byCollectionRef.get();
    snapshot.forEach(doc => {
        documents.push({
            id: doc.id,
            ...doc.data()
        });
    });

    const max = documents.reduce((acc, val) => {
        return acc.id > val.id ? acc : val;
    }, []);

    const idNumber = Number(max.id) || documents.length.toString();
    const id = Number(idNumber) + 1;

    await byCollectionRef.doc(`RDV-${id}`).set({
        ...payload,
        id
    });

    res.status(200).send({
        ...payload,
        id
    });
})

app.post('/api/saveDoc', async function (req, res) {
    // const locations = getPayloadLocations(req.body);
    const payload = {
        ...req.body,
    };

    const byCollectionRef = db.collection(DOCUMENTS_KEY);
    await byCollectionRef.doc(`RDV-${req.body.id}`).set(payload);
    res.status(200).send(payload);
})

app.get('/api/getDoc', async function (req, res) {
    const { id } = req.query;

    let documents = [];

    const byCollectionRef = db.collection(DOCUMENTS_KEY);
    const snapshot = await byCollectionRef.get();
    snapshot.forEach(doc => {
        documents.push({
            ...doc.data()
        });
    });
    const document = documents.find(doc => doc.id == id);

    if (!document) {
        res.status(400).send(`Document with ID: ${id} is not found`);
        return;
    }

    res.status(200).send(document);
})

app.listen(process.env.PORT || 80, async() => {
    console.log('Started on port', process.env.PORT || 80)
})
