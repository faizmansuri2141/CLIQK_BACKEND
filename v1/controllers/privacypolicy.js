const privacypolicyData = require('../../models/privacypolicy');
const term_of_useData = require('../../models/term_of_use')
const community_guid_lines = require('../../models/comminity_guidlines')
const mongoose = require('mongoose');


exports.privacyPolicy = async (req, res, next) => {

    try {

        console.log("body=....", req.body)

        const result = await privacypolicyData.findByIdAndUpdate(req.body.id, { text: req.body.text }, { new: true })

        res.redirect('/privacypolicy')



    } catch (error) {
        res.redirect('/privacypolicy' + error)
    }

}


exports.term_of_use = async (req, res, next) => {
    try {
        const result = await term_of_useData.findByIdAndUpdate(req.body.id, { text: req.body.text }, { new: true })
        res.redirect('/term_of_use')

    } catch (error) {
        res.redirect('/term_of_use' + error)
    }

}

// community_guid_lines
exports.community_guidlines = async (req, res, next) => {
    try {
        const result = await community_guid_lines.findByIdAndUpdate(req.body.id, { text: req.body.text }, { new: true })
        res.redirect('/community_guidlines')

    } catch (error) {
        res.redirect('/community_guidlines' + error)
    }

}
