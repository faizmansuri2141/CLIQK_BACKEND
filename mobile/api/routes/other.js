var express = require('express');
var router = express.Router();
const vary = require('../../../middleware/authUser');
const otherControllers = require ('../controllers/other');

router.post('/verification' , vary , otherControllers.verification );
router.post('/payment' , vary ,otherControllers.payment );


// payment_subscribtion
router.post("/subscribtion", vary, otherControllers.create_subscribtion);
router.post("/remove_section" , vary , otherControllers.cancel_subscription);
// complete subscription
router.post('/complete_subscription' , vary , otherControllers.complete_subscription);
router.get('/privacy_policy'  , otherControllers.privacy_policy);
router.get('/terms_of_use' , otherControllers.terms_of_use);
router.get('/community_guid_lines' , otherControllers.community_guid_lines);



router.post('/save_card' , vary ,otherControllers.stripeCardSave);
router.post('/card_list' , vary , otherControllers.cardList);
// Charge
router.post('/given_tip' , vary , otherControllers.charge);




module.exports = router



