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
const certiqOcp = process.env.certiqOcp
const axios = require('axios')
const Handlebars = require("handlebars");
const fs = require('fs');
var html_to_pdf = require('html-pdf-node');
require('firebase/storage')
const ver = require('./package.json').version
const iyc = require('./public/iyc')
const grc = require('./public/grc');
const moment = require('moment/moment');
const { now } = require('moment/moment');


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
app.use(express.static(__dirname + '/imgs'));

Handlebars.registerHelper("int", function(qty){
    if(!isNaN(qty) && qty>0){
        return parseInt(qty)
    }else{
        return null
    }
})

Handlebars.registerHelper("sum3", function(amt1,amt2, amt3){
    if(amt1!=null && amt1!='' && amt2!=null && amt2!='' && amt3!=null && amt3!=''){
        return '€ ' + new Intl.NumberFormat("it", {
            minimumIntegerDigits: 1,
            minimumFractionDigits: 2,
            maximumFractionDigits:2,
          }).format(parseFloat(amt1)+parseFloat(amt2)+parseFloat(amt3))
    }else if(amt1!=null && amt1!='' && amt2!=null && amt2!=''){
        return '€ ' + new Intl.NumberFormat("it", {
            minimumIntegerDigits: 1,
            minimumFractionDigits: 2,
            maximumFractionDigits:2,
          }).format(parseFloat(amt1)+parseFloat(amt2))
    }else if(amt1!=null && amt1!='' && amt3!=null && amt3!=''){
        return '€ ' + new Intl.NumberFormat("it", {
            minimumIntegerDigits: 1,
            minimumFractionDigits: 2,
            maximumFractionDigits:2,
          }).format(parseFloat(amt1)+parseFloat(amt3))
    }else if(amt2!=null && amt2!='' && amt3!=null && amt3!=''){
        return '€ ' + new Intl.NumberFormat("it", {
            minimumIntegerDigits: 1,
            minimumFractionDigits: 2,
            maximumFractionDigits:2,
          }).format(parseFloat(amt2)+parseFloat(amt3))
    }{
        return null
    }
})

Handlebars.registerHelper('maxTwoDigits', function(value, disc){
    if(value!=null && value!='' && disc){
        return new Intl.NumberFormat("it", {
            minimumIntegerDigits: 1,
            minimumFractionDigits: 0,
            maximumFractionDigits:2,
        }).format(value)
    }else{
        return null
    }
})

Handlebars.registerHelper('twoDigits', function(value, disc){
    if(value!=null && value!='' && disc){
        return '€ ' + new Intl.NumberFormat("it", {
            minimumIntegerDigits: 1,
            minimumFractionDigits: 2,
            maximumFractionDigits:2,
        }).format(value)
    }else{
        return null
    }
})

Handlebars.registerHelper('thousands', function(value, disc){
    if(value!=null && value!='' && disc){
        return new Intl.NumberFormat("it", {
            minimumIntegerDigits: 1,
            minimumFractionDigits: 0,
            maximumFractionDigits:0,
        }).format(value)
    }else{
        return null
    }
})

Handlebars.registerHelper("seAir", function(type, options){
    if(type=='Air') return options.fn(this)
    return options.inverse(this)
})

Handlebars.registerHelper("seTruck", function(type, options){
    if(type=='Truck') return options.fn(this)
    return options.inverse(this)
})

Handlebars.registerHelper("psd", function(val, options){
    if(parseFloat(val)>0) return options.fn(this)
    return options.inverse(this)
})

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'episerjob@gmail.com',
      pass: 'xvesvmaufsunnzvr' 
    }
  });

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
        transporter.sendMail(iyc.createMailOptions(arg), (error, info)=>{
            if (error) {
            console.log(error);
            } else {
                transporter.sendMail(iyc.createMailOptionsIntProd(arg), (error, info)=>{
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
            transporter.sendMail(iyc.createMailOptions(arg), (error, info)=>{
                if (error) {
                console.log(error);
                } else {
                    transporter.sendMail(iyc.createMailOptionsIntProd(arg), (error, info)=>{
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
        transporter.sendMail(iyc.createMailOptions(arg), (error, info)=>{
            if (error) {
            console.log(error);
            } else {
                transporter.sendMail(iyc.createMailOptionsInt(arg), (error, info)=>{
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
        url: 'https://api.epiroc.com/certiq/v2/authentication/login?username=marco.arato@epiroc.com&password=' + process.env.certiqPassword,
        headers: {
            'Ocp-Apim-Subscription-Key':certiqOcp
        }
    })
    .then(data=>{
        code=data.data.userCode
        console.log(code)
        axios({
            method:'get',
            url: 'https://api.epiroc.com/certiq/v2/machines',
            headers: {
                'Ocp-Apim-Subscription-Key':certiqOcp,
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
                        'Ocp-Apim-Subscription-Key':certiqOcp,
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
                            'Ocp-Apim-Subscription-Key':certiqOcp,
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
      iyc.createMailParts(req.body?req.body:req.query.info)
        .then(a=>{
            transporter.sendMail(a, (error, info)=>{
                if (error) res.status(300).send(error)
                if(info) res.status(200).send(info)
            })
        })  
    } else {
        iyc.createMailPartsImi(req.body?req.body:req.query.info)
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

app.all('/iyc/sendSJNew', cors(), async function(req,res){
    let g = req.body
    await iyc.getBL(g).then(c=>{g.copiaMail=c})
    iyc.createMA(g)
    .then(urlMa=>{
        if(!g.info) g.info={}
        if(!g.info.urlMa) g.info.urlMa={}
        g.info.urlMa = urlMa
        iyc.createPDF(g).then(urlPdf=>{
            console.log(urlPdf)
            g.info.urlPdf = urlPdf
            admin.app('default').auth().getUser(g.userId).then(user=>{
                g.info.ccAuth = user.email 
                transporter.sendMail(iyc.createMailOptionsNewMA(g), (error, info)=>{
                    if(error) res.status(300).send(error)
                    if(info) {
                        transporter.sendMail(iyc.createMailOptionsNew(g), (error, info)=>{
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

app.all('/iyc/certiqHrs',function(req,res){
    axios({
        method:'get',
        url: 'https://api.epiroc.com/certiq/v2/authentication/login?username=marco.arato@epiroc.com&password=' + process.env.certiqPassword,
        headers: {
            'Ocp-Apim-Subscription-Key':certiqOcp
        }
    })
    .then(data=>{
        let uCode = data.data.userCode
        axios({
            method:'get',
            url: 'https://api.epiroc.com/certiq/v2/machines',
            headers: {
                'Ocp-Apim-Subscription-Key':certiqOcp,
                'X-Auth-Token':uCode
            }
        })
        .then((info)=>{
            let machines = info.data.data
            let count = machines.length
            let index=0
            var list=list||{}
            machines.forEach(m=>{
                let yy = /(?<= - ).*(?= - )/g
                let arr = yy.exec(m.machineName)
                let name=''
                try{
                    name=[arr[0]]
                    list[name]=list[name]||{}
                } catch{}
                axios({
                    method:'get',
                    url:'https://api.epiroc.com/certiq/v2/machines/'+m.machineItemNumber+'/kpiOverview/',
                    headers:{
                       'Ocp-Apim-Subscription-Key':certiqOcp,
                        'X-Auth-Token':uCode, 
                    }
                })
                .then(d=>{
                    list[name]= d.data
                })
                .catch((err)=>{
                    console.log('ERROR')
                })
                .finally(()=>{
                    index++
                    if(index==count) res.json(list)
                })
            })
            
        })
    })
})

app.all('/iyc/consuntivo', async function(req,res){
    var data    = fs.readFileSync('./template/consuntivo.html','utf8')
    var temp = Handlebars.compile(data)
    let info=req.body?req.body:{} 
    info.title="CONSUNTIVO"
    info.sj = "SCHEDA LAVORO"
    console.log(info)
    iyc.getAmount(info)
    .then(tem=>{
        let k=Object.keys(tem)
        let sumSer=0
        let sumPar=0
        let sumGross=0
        k.forEach(ke=>{
            if(!isNaN(tem[ke].tot) && tem[ke].tot!=''  && tem[ke].pnr!='') {
                sumPar+=parseFloat(tem[ke].llp)*parseFloat(tem[ke].qty)
            }
            if(!isNaN(tem[ke].tot) && tem[ke].tot!=''  && tem[ke].pnr=='') sumSer+=parseFloat(tem[ke].tot)
        })
        sumPar=sumPar*(1-info.__psdDiscount/100)
        iyc.getTransportCost(tem,info)
        .then((tc)=>{
            if (info.a220terms=='') info.a220terms='Solito in uso'
            info.tc=tc
            info.sumSer = sumSer.toFixed(2)
            info.safetyFactor = 3
            info.safety = (info.sumSer * info.safetyFactor/100).toFixed(2)
            info.sumPar = sumPar.toFixed(2)
            info.items = Object.values(tem)
            info.frase=iyc.img.toString('base64')
            info.logo=iyc.logo.toString('base64')
            info.footer=iyc.footer.toString('base64')
            let options = {format: 'A4', margin:{top:0,bottom:0,left:0,right:0},printBackground: true};
            if(req.body.type=='preview') {
                //res.json({res:temp(info)})
                res.send(temp(info))
            }else {
                let file = {content: temp(info)}
                html_to_pdf.generatePdf(file,options).then((d)=>{if(d) res.end(d)})  
            }
        })
    })
})

app.all('/iyc/offerta', async function(req,res){
    var data=fs.readFileSync('./template/offerta.html','utf8')
    var temp = Handlebars.compile(data)
    let info={}
    info.frase=iyc.img.toString('base64')
    info.logo=iyc.logo.toString('base64')
    info.footer=iyc.footer.toString('base64')
    info.title='OFFERTA'
    res.send(temp(info))
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
    })
})

app.all('/grc/sjPdfForApproval', function(req,res){
    let g = req.body
    grc.createPDFforApprovalgrc(g)
    .then(()=>{
        res.status(200).json({saved:true})
    })
})

app.all('/grc/sendSJNew', function(req,res){
    let g = req.body
    console.log(g)
    grc.createPDFgrc(g).then(urlPdf=>{
        g.info.urlPdf = urlPdf
        admin.app('grc').auth().getUser(g.userId).then(user=>{
            g.info.ccAuth = user.email
            transporter.sendMail(grc.createMailOptionsNewgrc(g), (error, info)=>{
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