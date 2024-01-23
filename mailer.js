const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    service: "Gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: 'tateforlife1@gmail.com',
      pass: 'zmhe nvey bfdt goto'
    }
});
// const transporter = nodemailer.createTransport({
//     host: "easycars.lv",
//     port: 465,
//     secure: true,
//     auth: {
//       user: 'info@easycars.lv',
//       pass: ''
//     }
// });

const sendContractToClient = (email, name) => {
    console.log('Sending email with contract to: ', email)
    transporter.sendMail({
        from: 'info@easycars.lv',
        to: email,
        subject: `${name} | EasyCars have sent you a contract + invoice`,
        text: 'Document has been signed, enjoy the attachments',
        attachments: [{
            filename: `${name}_contract.pdf`,
            path: `/var/data/pdf/${name}.pdf`
        }, {
            filename: `${name}_invoice.pdf`,
            path: `/var/data/invoice/${name}.pdf`
        }]
    }, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent to: ' + email, info.response);
        }
    });
}

module.exports = { transporter, sendContractToClient };