const express = require("express");
const app = express();
const admin = require('firebase-admin');
const { getStorage } = require('firebase-admin/storage');
const moment = require('moment');
const cors = require('cors')
const XlsxPopulate = require('xlsx-populate');
const fs = require('fs');
const pdf = require('pdf-lib');
// TODO add secret env key
const convertapi = require('convertapi')('BpMFm93JuS1vLLrV');
require('dotenv').config()

const LOCATIONS_MAP = {
    1: 'Riga, Valguma iela 4a',
    2: 'Riga International Airport RIX'
};

app.use(cors())
app.use(express.json());

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
    }),
    storageBucket: "ezcars-c112b.appspot.com"
});
const db = admin.firestore();

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

const convertContract = async (id) => {
    const x = convertapi.convert('pdf', {
        File: `/var/data/xlsx/${id}.xlsx`,
        WorksheetIndex: 2
    }, 'xls').then(function(result) {
        const y = result.saveFiles('/var/data/pdf/');

        return y;
    });

    return x;
};

const convertInvoice = async (id) => {
    const x = convertapi.convert('pdf', {
        File: `/var/data/xlsx/${id}.xlsx`,
        WorksheetIndex: 3
    }, 'xls').then(function(result) {
        const y = result.saveFiles('/var/data/invoice/');

        return y;
    });

    return x;
};

app.post("/api/downloadContract", async (req, res) => {
    const name = `RDV-${req.body.id}`;
    const path = `/var/data/pdf/${name}.pdf`;
    try {
        if (fs.existsSync(path)) {
            let fileRef;
            try {
                fileRef = await getStorage().bucket().file(`sign/RDV-${req.body.id}.png`).download();
            } catch(e) {
                console.log(e)
            }

            if (fileRef) {
                const existingPdfBytes = fs.readFileSync(`/var/data/pdf/${name}.pdf`);
                const pdfDoc = await pdf.PDFDocument.load(existingPdfBytes)
                const page = pdfDoc.getPages()[3]
                const pngImage = await pdfDoc.embedPng(fileRef[0])
                page.drawImage(pngImage, {
                    x: page.getWidth() / 4,
                    y: 122,
                    width: 40,
                    height: 40
                })
                const pdfBytes = await pdfDoc.save()                

                var fileContents = Buffer.from(pdfBytes, "base64");
                var savedFilePath = `/var/data/temp/RDV-${req.body.id}.pdf`; // in some convenient temporary file folder
                fs.writeFile(savedFilePath, fileContents, function() {
                    res.status(200).download(savedFilePath, `RDV-${req.body.id}`);
                });
            } else {
                res.download(path);
            }
        } else {
            res.sendStatus(404);
        }
    } catch(err) {
        res.sendStatus(404);
    }
});

app.post("/api/downloadInvoice", async (req, res) => {
    const name = `RDV-${req.body.id}`;
    const path = `/var/data/invoice/${name}.pdf`;
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

app.post('/api/create', async (req, res) => {
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
        "status": "created",
        "createdAt": moment().format('DD.MM.YYYY')
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

app.post('/api/createDoc', async (req, res) => {
    const payload = {
        ...req.body,
        "carModel": carMap[req.body.carId] || req.body.carId || null,
        "carMaxSpeed": 130 || null,
        "otherDeposit": 300 || null,
        "otherFuelLevel": '100%' || null,
        "isSigned": false,
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
            ...doc.data()
        });
    });

    const max = documents.reduce((acc, val) => {
        return Number(acc.id) > Number(val.id) ? acc : val;
    }, {});

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

app.post('/api/saveDoc', async (req, res) => {
    console.log(req.body)
    const {
        delivery,
        admission,
    } = getPayloadLocations(req.body);
    const payload = {
        ...req.body,
        wasSaved: true,
    };

    const byCollectionRef = db.collection(DOCUMENTS_KEY);
    await byCollectionRef.doc(`RDV-${req.body.id}`).set(payload);

    const name = `RDV-${req.body.id}`;
    const x = XlsxPopulate.fromFileAsync("./template.xlsx")
        .then(workbook => {
            // dates/locations
            workbook.sheet(0).cell("C2").value(`RDV/${req.body.id}`);
            workbook.sheet(0).cell("C3").value(req.body.from);
            workbook.sheet(0).cell("C4").value(req.body.to);
            workbook.sheet(0).cell("C5").value(delivery);
            workbook.sheet(0).cell("C6").value(admission);
            // driver info
            workbook.sheet(0).cell("H3").value(req.body.username);
            workbook.sheet(0).cell("H4").value(req.body.birth);
            workbook.sheet(0).cell("H5").value(req.body.tel);
            workbook.sheet(0).cell("H6").value(req.body.email);
            workbook.sheet(0).cell("H7").value(req.body.passNumber);
            workbook.sheet(0).cell("H8").value(req.body.passExp);
            workbook.sheet(0).cell("H9").value(req.body.passCountry);
            workbook.sheet(0).cell("H10").value(req.body.licenseCountry);
            workbook.sheet(0).cell("H11").value(req.body.licenseNumber);
            workbook.sheet(0).cell("H12").value(req.body.licenseExp);
            workbook.sheet(0).cell("H13").value(req.body.bankCard);
            workbook.sheet(0).cell("H14").value(req.body.bankCardExp);
            // car info
            workbook.sheet(0).cell("H19").value(req.body.carModel);
            workbook.sheet(0).cell("H21").value(req.body.carPlates);
            workbook.sheet(0).cell("H22").value(req.body.carChassisNumber);
            workbook.sheet(0).cell("H23").value(req.body.carRegPassNumber);
            workbook.sheet(0).cell("H24").value(req.body.carYear);
            workbook.sheet(0).cell("H25").value(req.body.carColor);
            workbook.sheet(0).cell("H26").value(req.body.carFuelType);
            workbook.sheet(0).cell("H27").value(req.body.carValueEur);
            workbook.sheet(0).cell("H28").value(req.body.carMaxSpeed);
            // other info
            workbook.sheet(0).cell("M5").value(req.body.otherDriverAddress);
            workbook.sheet(0).cell("M6").value(req.body.otherAdditionalDriverData);
            workbook.sheet(0).cell("M7").value(req.body.otherDeposit);
            workbook.sheet(0).cell("M8").value(req.body.otherFuelLevel);
            workbook.sheet(0).cell("M9").value(req.body.lang);

            return workbook.toFileAsync(`/var/data/xlsx/${name}.xlsx`);
        });

    x.then(() => {
        convertContract(name).then(() => {
            convertInvoice(name).then(() => res.send(payload))
        });
    })
})

app.get('/api/getDoc', async (req, res) => {
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

app.listen(process.env.PORT || 80, async () => {
    console.log('Started on port', process.env.PORT || 80)
})
