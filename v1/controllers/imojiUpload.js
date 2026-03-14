const imojiControllers = require('../../models/imojiss')

exports.imojoPages = async (req, res) => {
    res.render('addImoji');
}

exports.imojisUpload = async (req, res, next) => {
    try {
      console.log("files" , req.file)
      const { imojiName } = req.body;
      const file = req.file;
  
      if (!file) {
        return res.status(400).send("No file uploaded.");
      }
  
      const newImoji = new imojiControllers({
        imojiName,
        imojiImage: file.location // or file.path if you store full path
      });
  
      await newImoji.save();
  
      res.redirect('/imoji'); // or wherever you want to redirect after upload
    } catch (error) {
      console.error("Error uploading imoji:", error);
      res.status(500).send("Something went wrong.");
    }
  };

  exports.Emojis = async (req , res , next)=>{
    try {
        const emojisList = await imojiControllers.find({})
        return res.render ("emojiList" , {data :emojisList })

    }catch(error) {
        console.log("error" , error)
        return res.send({status : 0 , message :"Something went wrong."})
    }
  }