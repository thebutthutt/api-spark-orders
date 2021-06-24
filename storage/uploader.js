const { GridFsStorage } = require("multer-gridfs-storage");
const multer = require("multer");

const storage = new GridFsStorage({
    url: process.env.MONGOURI,
    options: { useUnifiedTopology: true },
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            const fileInfo = {
                filename: file.originalname,
                bucketName: "uploads",
            };
            resolve(fileInfo);
        });
    },
});

const upload = multer({ storage });

module.exports = upload;
