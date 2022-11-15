var express = require('express');
var app = express();
var cors = require('cors')
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
var admin = require("firebase-admin");
var admingrc = require("firebase-admin");
var serviceAccount = require('./key.json')
var serviceAccountgrc = require('./keygrc.json')
const porta = process.env.PORT || 3001
const axios = require('axios')
const Handlebars = require("handlebars");
const fs = require('fs');
var html_to_pdf = require('html-pdf-node');
const firebase = require('firebase/app')
const firebasegrc = require('firebase/app');
const { config } = require('process');
require('firebase/storage')
const ver = require('./package.json').version
const external = require('./public/functions')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://epi-serv-job-default-rtdb.firebaseio.com"
},'default')

admin.initializeApp({
    credential: admin.credential.cert(serviceAccountgrc),
    databaseURL: "https://episjobadmingrc-default-rtdb.europe-west1.firebasedatabase.app",
},'grc');

app.use(cors())
app.use(bodyParser.urlencoded({limit: '50000kb',extended: true}))
app.use(bodyParser.json({limit: '50000kb'}))
app.use('/public',express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/template'));

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'episerjob@gmail.com',
      pass: 'xvesvmaufsunnzvr' 
    }
  });

  app.all('/iyc/test', function(req,res){
    res.send(external.test())
})

app.all('/grc', function(req,res){
    admin.app('grc').auth().listUsers(1000).then((a)=>{
        res.send(a.users)
    })
})

app.all('/iyc', function(req,res){
    admin.app('default').auth().listUsers(1000).then((a)=>{
        res.send(a.users)
    })
})

app.get('/iyc/getusers', function(req,res){
    admin.app('default').auth().listUsers(1000).then((a)=>{
        res.send(a.users)
    })
})

app.get('/iyc/getuserinfo', function(req,res){
    var id = req.query.id
    admin.app('default').database().ref('Users/'+ id).once('value', a=>{
        res.status(200).send(a.val())
    })
})

app.get('/iyc/createuser', function(req,res){
    var Mail = req.query.Mail
    var Nome = req.query.Nome
    var Cognome = req.query.Cognome
    var Pos=req.query.Pos
    var km = req.query.km
	var userVisit = req.query.userVisit
    admin.app('default').auth().createUser({
        email: Mail,
        emailVerified: false,
        password: 'Epiroc2021',
        disabled: false,
    })
    .then((userRecord) => {
        var Area = undefined
        let id = userRecord.uid
        if(req.query.Area!=undefined) Area = req.query.Area
        admin.app('default').database().ref('Users').child(id).child('Cognome').set(Cognome)
        admin.app('default').database().ref('Users').child(id).child('Nome').set(Nome)
        admin.app('default').database().ref('Users').child(id).child('Pos').set(Pos)
        admin.app('default').database().ref('Users').child(id).child('userVisit').set(userVisit)
        admin.app('default').database().ref('Users').child(id).child('Area').set(Area)
        .then(()=>res.status(200).send('ok'))
        .catch((error) => {
            res.status(300).send('Errore: ' + error)
        })
    })
    .catch((error) => {
        res.status(300).send('Errore: ' + error)

    });
})

app.all('/iyc/updateuser', function(req,res){
    var Nome = req.query.Nome
    var Cognome = req.query.Cognome
    var Pos=req.query.Pos
    var id = req.query.id
	var userVisit = req.query.userVisit
    var Area = undefined
    var ws = undefined
    if(req.query.Area!=undefined) Area = req.query.Area
    if(req.query.ws!=undefined) ws = req.query.ws
    admin.app('default').database().ref('Users').child(id).child('Cognome').set(Cognome)
    admin.app('default').database().ref('Users').child(id).child('Nome').set(Nome)
    admin.app('default').database().ref('Users').child(id).child('Pos').set(Pos)
    admin.app('default').database().ref('Users').child(id).child('userVisit').set(userVisit)
    admin.app('default').database().ref('Users').child(id).child('Area').set(Area)
    admin.app('default').database().ref('Users').child(id).child('ws').set(ws)
    .then(()=>res.status(200).json({status:'ok'}))
})

app.get('/iyc/delete',function(req,res){
    var id = req.query.id
    admin.app('default').auth().deleteUser(id)
    .then(()=>{
        admin.app('default').database().ref('Users/' + id).remove()
        .then(()=>{
            res.status(200).send('ok') 
         })
    })
    .catch(err=>{
        console.log(err)
    })
})


app.all('/iyc/mail', function(req, res,next) {
    var arg = req.query
    if(arg.to1!=undefined){
        transporter.sendMail(external.createMailOptions(arg), (error, info)=>{
            if (error) {
            console.log(error);
            } else {
                transporter.sendMail(external.createMailOptionsIntProd(arg), (error, info)=>{
                    if (error) {
                    console.log(error);
                    } else {
                        res.status(200).send(arg.to1);
                    }
                })
            }
        });
    } else {
        res.send('Mail not sent')
    }
});

app.all('/iyc/mailmod', async function(req, res,next) {
    var arg = req.query
    let refPdf = admin.app('default').storage().ref().child(`${arg.userN} ${arg.userC}/${arg.fileN}.pdf`)
    await refPdf.put(arg.urlPdf)
    .then(()=>{
        refPdf.getDownloadURL().then(url=>{
            if(url) req.urlPdf = url
            let refMa = admin.app('default').storage().ref().child(`${arg.userN} ${arg.userC}/${arg.fileN}.ma`)
            refMa.put(arg.urlMa)
            .then(()=>{
                refMa.getDownloadURL().then(url=>{
                    if(url) req.urlMa = url
                })
            })
        })
    })
    setTimeout(() => {
        if(arg.to1!=undefined){
            transporter.sendMail(external.createMailOptions(arg), (error, info)=>{
                if (error) {
                console.log(error);
                } else {
                    transporter.sendMail(external.createMailOptionsIntProd(arg), (error, info)=>{
                        if (error) {
                        console.log(error);
                        } else {
                            res.status(200).send(arg.to1);
                        }
                    })
                }
            });
        } else {
            res.send('Mail not sent')
        }
    }, 1000);
    
})

app.all('/iyc/maildebug', async function(req, res,next) {
    var arg = req.query
    if(arg.to1!=undefined){
        transporter.sendMail(external.createMailOptions(arg), (error, info)=>{
            if (error) {
            console.log(error);
            } else {
                transporter.sendMail(external.createMailOptionsInt(arg), (error, info)=>{
                    if (error) {
                    console.log(error);
                    } else {
                        res.status(200).send(arg.to1);
                    }
                })
            }
        });
    } else {
        res.send('Mail not sent')
    }
});

app.get('/iyc/certiq', function(req,res){
    console.log(req.query)
    let count = 0
    let code=''
    let machines=[]
    let lung=0
    let itemNr=[]
    let yesterday = req.query.day
    axios({
        method:'get',
        url: 'https://api.epiroc.com/certiq/v2/authentication/login?username=marco.arato@epiroc.com&password=Epiroc2019',
        headers: {
            'Ocp-Apim-Subscription-Key':'3b705806444d47f3b2308cf6c138ac74'
        }
    })
    .then(data=>{
        code=data.data.userCode
        console.log(code)
        axios({
            method:'get',
            url: 'https://api.epiroc.com/certiq/v2/machines',
            headers: {
                'Ocp-Apim-Subscription-Key':'3b705806444d47f3b2308cf6c138ac74',
                'X-Auth-Token':code
            }
        })
        .then(info=>{
            machines= info.data.data
            lung = machines.length
            machines.forEach(sr=>{
                delete sr.machineId
                delete sr.machineCustomerCenter
                delete sr.machineType
                delete sr.rigConfigVersion
                delete sr.rigSoftwareVersion
                let t6 = sr.machineName
                let t7 = t6.split(/ - /g)
                sr.machineSerialNr = t7[1]
                delete sr.machineName
                let s1 = sr.machineSite.replace(/.\(.+/,'')
                sr.machineSite=s1
                axios({
                    method:'get',
                    url: 'https://api.epiroc.com/certiq/v2/machines/'+ sr.machineItemNumber +'/kpis/' + yesterday,
                    headers: {
                        'Ocp-Apim-Subscription-Key':'3b705806444d47f3b2308cf6c138ac74',
                        'X-Auth-Token':code
                    }
                })
                .then(gg=>{
                    if(sr.machineSerialNr=='TMG19SED0497') console.log(gg)
                    sr.LastDayEngineHours = Math.round(gg.data.dailyUtilizationEngineHours)
                    axios({
                        method:'get',
                        url: 'https://api.epiroc.com/certiq/v2/machines/'+ sr.machineItemNumber +'/serviceStatus',
                        headers: {
                            'Ocp-Apim-Subscription-Key':'3b705806444d47f3b2308cf6c138ac74',
                            'X-Auth-Token':code
                        }
                    })
                    .then((service)=>{
                        let s = service.data
                        count++
                        //console.log(count)
                        s.forEach(sd=>{
                            if(sd.serviceStatus=='Upcoming' && sd.serviceType=='Engine'){
                               sr.serviceStep = sd.serviceAccumulator
                               sr.hoursLeftToService = sd.hoursLeftToService
                               sr.servicePredictedDate = sd.servicePredictedDate
                            }
                        })
                        if(count==machines.length){res.json(machines)}
                    })
                })
            })
            
        })
        .catch(e=>console.log(e))
    })
    .catch(e=>console.log(e))
})

app.all('/iyc/partreq', cors(), function(req,res){
    let dest = req.body?req.body.type:req.query.info.type
    if(dest!='Customer'){
      external.createMailParts(req.body?req.body:req.query.info)
        .then(a=>{
            transporter.sendMail(a, (error, info)=>{
                if (error) res.status(300).send(error)
                if(info) res.status(200).send(info)
            })
        })  
    } else {
        external.createMailPartsImi(req.body?req.body:req.query.info)
        .then(a=>{
            transporter.sendMail(a, (error, info)=>{
                if (error) res.status(300).send(error)
                if(info) res.status(200).send(info)
            })
        })  
    } 
})

app.all('/iyc/psdllp',function(req,res){
    let kt=0
    let a = req.query.parts
    let outP ={}
    let r = a.split(',')
    r.forEach(b=>{
        admin.app('default').database().ref('PSDItems').child(req.query.child).child(b).child('llp').once('value',p=>{
            outP[b]=({pn:b,llp: p.val()==null?0:parseFloat(p.val())})
            kt++
            if(r.length==kt) res.status(200).json(outP)
        })
    })
    
})

app.all('/iyc/sjPdf', function(req,res){
    var a = fs.readFileSync('template/template.html','utf8')
    var templ = Handlebars.compile(a)
    let options = {width: '21cm', height: '29.7cm'};
    let file = {content: templ(req.body)}
    html_to_pdf.generatePdf(file,options).then((d)=>{
        res.end(d)
    })
})

app.post('/iyc/sjMa', function(req,res){
    res.send(req.body)
})

app.all('/iyc/sendSJNew', cors(), function(req,res){
    let g = req.body
    external.createMA(g)
    .then(urlMa=>{
        g.info.urlMa = urlMa
        external.createPDF(g).then(urlPdf=>{
            g.info.urlPdf = urlPdf
            admin.app('default').auth().getUser(g.userId).then(user=>{
                g.info.ccAuth = user.email
                transporter.sendMail(external.createMailOptionsNewMA(g), (error, info)=>{
                    if(error) res.status(300).send(error)
                    if(info) {
                        transporter.sendMail(external.createMailOptionsNew(g), (error, info)=>{
                            if (error) res.status(300).send(error)
                            if(info) {
                                res.status(200).json({mailResult: info})             
                            }
                        })   
                    }
                })
            })
        })
    })
})


//GRC

app.all('/grc/getusers', function(req,res){
    admin.app('grc').auth().listUsers(1000).then((a)=>{
        res.send(a.users)
    })
})

app.all('/grc/getuserinfo', function(req,res){
    var id = req.query.id
    admin.app('grc').database().ref('Users/'+ id).once('value', a=>{
        res.status(200).send(a.val())
    })
})

app.all('/grc/createuser', function(req,res){
    var Mail = req.query.Mail
    var Nome = req.query.Nome
    var Cognome = req.query.Cognome
    var Pos=req.query.Pos
    var km = req.query.km
	var userVisit = req.query.userVisit
    admin.app('grc').auth().createUser({
        email: Mail,
        emailVerified: false,
        password: 'Epiroc2022',
        disabled: false,
    })
    .then((userRecord) => {
        var Area = undefined
        let id = userRecord.uid
        if(req.query.Area!=undefined) Area = req.query.Area
        admin.app('grc').database().ref('Users').child(id).child('Cognome').set(Cognome)
        admin.app('grc').database().ref('Users').child(id).child('Nome').set(Nome)
        admin.app('grc').database().ref('Users').child(id).child('Pos').set(Pos)
        admin.app('grc').database().ref('Users').child(id).child('userVisit').set(userVisit)
        admin.app('grc').database().ref('Users').child(id).child('Area').set(Area)
        .then(()=>res.status(200).send('ok'))
        .catch((error) => {
            res.status(300).send('Errore: ' + error)
        })
    })
    .catch((error) => {
        res.status(300).send('Errore: ' + error)
    });
})

app.all('/grc/updateuser', function(req,res){
    var Nome = req.query.Nome
    var Cognome = req.query.Cognome
    var Pos=req.query.Pos
    var id = req.query.id
	var userVisit = req.query.userVisit
    var Area = undefined
    var ws = undefined
    if(req.query.Area!=undefined) Area = req.query.Area
    if(req.query.ws!=undefined) ws = req.query.ws
    admin.app('grc').database().ref('Users').child(id).child('Cognome').set(Cognome)
    admin.app('grc').database().ref('Users').child(id).child('Nome').set(Nome)
    admin.app('grc').database().ref('Users').child(id).child('Pos').set(Pos)
    admin.app('grc').database().ref('Users').child(id).child('userVisit').set(userVisit)
    admin.app('grc').database().ref('Users').child(id).child('Area').set(Area)
    admin.app('grc').database().ref('Users').child(id).child('ws').set(ws)
    .then(()=>res.status(200).json({status:'ok'}))
})

app.all('/grc/delete',function(req,res){
    var id = req.query.id
    admin.app('grc').auth().deleteUser(id)
    .then(()=>{
        admin.app('grc').database().ref('Users/' + id).remove()
        .then(()=>{
            res.status(200).send('ok') 
         })
    })
    .catch(err=>{
        console.log(err)
    })
})

app.all('/grc/sjPdf', function(req,res){
    var a = fs.readFileSync('template/templategrc.html','utf8')
    var templ = Handlebars.compile(a)    
    let options = {width: '21cm', height: '29.7cm'};
    let file = {content: templ(req.body)}
    html_to_pdf.generatePdf(file,options).then((d)=>{
        if(d) res.end(d)
        res.send('error')
    })
})

app.all('/grc/sjPdfForApproval', function(req,res){
    let g = req.body
    external.createPDFforApprovalgrc(g)
    .then(()=>{
        res.status(200).json({saved:true})
    })
})

app.all('/grc/sendSJNew', function(req,res){
    let g = req.body
    external.createPDFgrc(g).then(urlPdf=>{
        g.info.urlPdf = urlPdf
        admin.app('grc').auth().getUser(g.userId).then(user=>{
            g.info.ccAuth = user.email
            transporter.sendMail(external.createMailOptionsNewgrc(g), (error, info)=>{
                if (error) res.status(300).send(error)
                if (info) {
                    res.status(200).json({mailResult: info})             
                }
            })   
        })
    })
})

//ALL

app.all('/', function(req, res,next) {
    const welc = `
    <div style="position: fixed; top:0;left:0;display:flex; justify-content: center; align-items: center; width:100%; height:100%; background-color: rgb(66, 85, 99)">
        <h1 style="font-family: Arial; text-align:center; width: 100%; color: rgb(255,205,0)">Welcome to Epiroc Italia/Hellas Service Job Admin Tool Web Services ver ${ver}</h1>
    </div>
    `
    res.status(200).send(welc);
    res.end();
});

app.all('*', function(req, res,next) {
    const welc = `
    <div style="position: fixed; top:0;left:0;display:flex; justify-content: center; align-items: center; width:100%; height:100%; background-color: rgb(66, 85, 99)">
        <h1 style="font-family: Arial; text-align:center; width: 100%; color: rgb(255,205,0)">404 - Sorry, page not found</h1>
    </div>
    `
    res.status(404).send(welc);
    res.end();
});

app.listen(porta, ()=>{
    console.log(`Running on port:${porta}`)
});

//FUNCTIONS
