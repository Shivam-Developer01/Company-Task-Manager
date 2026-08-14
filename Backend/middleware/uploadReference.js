const multer = require("multer");
const { FILE_UPLOAD } = require("../constants/constants");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (FILE_UPLOAD.ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type"));
  }
};

module.exports = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: FILE_UPLOAD.MAX_FILE_SIZE,
  },
});