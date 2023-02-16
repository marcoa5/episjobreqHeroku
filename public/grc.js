const Handlebars = require("handlebars");
const fs = require('fs');
var html_to_pdf = require('html-pdf-node')
//require('firebase/storage')
const firebasegrc = require('firebase/app')

firebasegrc.default.initializeApp({
    apiKey: "AIzaSyA9OHPbSNKBJUE7DqLAopJkfMMICo8hkHw",
    authDomain: "episjobadmingrc.firebaseapp.com",
    databaseURL: "https://episjobadmingrc-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "episjobadmingrc",
    storageBucket: "episjobadmingrc.appspot.com",
    messagingSenderId: "918912403305",
    appId: "1:918912403305:web:4346393bf9409facc91ff8",
    measurementId: "G-R54FWQY8XB"
  })


exports.createPDFgrc = function(b){
    return new Promise((res,rej)=>{
        var a = fs.readFileSync('template/templategrc.html','utf8')
        var templ = Handlebars.compile(a)
        let options = {width: '21cm', height: '29.7cm'};
        let file = {content: templ(b)}
        html_to_pdf.generatePdf(file,options).then((d)=>{
            let ref = firebasegrc.default.storage().ref(b.author + '/' + b.info.fileName + '.pdf')
            ref.put(Uint8Array.from(Buffer.from(d)).buffer, {contentType: 'application/pdf'})
            .then(()=>{
                ref.getDownloadURL().then(url=>{
                    res(url)
                })
            })
        })
    })
}

exports.createPDFforApprovalgrc = function(b){
    return new Promise((res,rej)=>{
        var a = fs.readFileSync('template/templategrc.html','utf8')
        var templ = Handlebars.compile(a)
        let options = {width: '21cm', height: '29.7cm'};
        let file = {content: templ(b)}
        html_to_pdf.generatePdf(file,options).then((d)=>{
            let ref = firebasegrc.default.storage().ref('Closed/' + b.info.fileName + '.pdf')
            ref.put(Uint8Array.from(Buffer.from(d)).buffer, {contentType: 'application/pdf'})
            .then(()=>{
                ref.getDownloadURL().then(url=>{
                    console.log('saved')
                    res(url)
                })
            })
        })
    })
}

exports.createMailOptionsNewgrc = function(a){
    let cc=[]
    cc.push('dimitris.nikolakopoulos@epiroc.com')
    cc.push('marco.arato@epiroc.com')
    if(!cc.includes(a.info.ccAuth)) cc.push(a.info.ccAuth)
    let tech= a.author
    const mailOptionsNew = {
            from: `${a.author} - Epiroc Service GRC <episerjob@gmail.com>`,
            replyTo: 'dimitris.nikolakopoulos@epiroc.com',
            to: a.elencomail,
            cc: a.info.cc? cc.join(';'):'',
            subject: a.info.subject,
            text: `Please find attached Service Job by Epiroc techinician Mr. ${tech}.\nThank you for completing the survey.\n\n\nSurvey Results:\n\nPlanning: ${a.rissondaggio.split('')[0]}\nParts Delivery: ${a.rissondaggio.split('')[1]}\nExecution: ${a.rissondaggio.split('')[2]}`,
            attachments: {
                filename: a.info.fileName + '.pdf',
                path: a.info.urlPdf
            }
        }

    return (mailOptionsNew)
}