const childSaftyControllers = require('../../models/childsafty')


exports.updateChildSafty = async (req,res,next) =>{
    try {
        const id = req.body.id
        const text = req.body.text

        console.log("body" , req.body)

        const update = await childSaftyControllers.findByIdAndUpdate(id , { text:text}, { new: true })

        return res.redirect('/getChildSafty')

    }
    catch(error) {
        console.log("error" , error)
        return res.redirect('/getChildSafty')

    }
}

exports.getChildSafty = async (req,res,next) =>{
    try {

        const get = await childSaftyControllers.findOne().lean()
        return   res.render('childsafty', { title: 'childsafty', record: get })

    }
    catch(error) {
        console.log("error" , error)
    }
}


exports.getChildSaftyWeb = async (req,res,next) =>{
    try {

        const get = await childSaftyControllers.findOne().lean()
        console.log("get" ,get)
        return   res.render('childWeb', { title: 'childsafty', htmlContent: get.text })

    }
    catch(error) {
        console.log("error" , error)
    }
}