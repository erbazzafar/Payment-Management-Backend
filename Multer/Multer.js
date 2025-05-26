const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, callBack) {
        callBack(null, 'uploads/');
    },
    filename: function (req, file, callBack) {
        const filename = Date.now() + path.extname(file.originalname);
        callBack(null, filename);
    },
});

const upload = multer({ storage });

module.exports = upload;