const ffmpeg = require("fluent-ffmpeg");
const sharp = require("sharp");
const tf = require("@tensorflow/tfjs-node");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");
const nsfw = require("nsfwjs");
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

async function extractFrame(videoBuffer) {
  const tempVideoPath = path.join(__dirname, "temp_video.mp4");
  const tempFramePath = path.join(__dirname, "temp_frame.png");

  await writeFileAsync(tempVideoPath, videoBuffer);

  return new Promise((resolve, reject) => {
    ffmpeg(tempVideoPath)
      .on("end", async () => {
        try {
          const frameBuffer = await fs.promises.readFile(tempFramePath);
          await unlinkAsync(tempVideoPath);
          await unlinkAsync(tempFramePath);
          resolve(frameBuffer);
        } catch (error) {
          reject(error);
        }
      })
      .on("error", (error) => {
        reject(error);
      })
      .screenshots({
        count: 1,
        folder: __dirname,
        filename: "temp_frame.png",
        size: "320x240",
      });
  });
}

async function checkVideoContent(videoBuffer) {
  try {
    const frameBuffer = await extractFrame(videoBuffer);

    // Verifique o formato do frame
    const metadata = await sharp(frameBuffer).metadata();
    const supportedFormats = ["jpeg", "png", "gif", "bmp", "webp"];

    if (!supportedFormats.includes(metadata.format)) {
      throw new Error("Unsupported image format");
    }

    // Converta o frame para um formato suportado, se necessário
    let processedFrameBuffer = frameBuffer;
    if (metadata.format === "webp") {
      processedFrameBuffer = await sharp(frameBuffer).png().toBuffer();
    }

    // Continue com o processamento do frame
    const image = tf.node.decodeImage(processedFrameBuffer, 3);
    // Adicione sua lógica de processamento aqui
    return verifyImage(image);
  } catch (error) {
    console.error("Error processing video content:", error);
    return false;
  }
}
/**
 *
 * @param {Buffer} buffer
 * @returns {Promise<boolean>}
 */
const checkImageContent = async (buffer) => {
  let imageBuffer = buffer;
  const imageType = await sharp(buffer)
    .metadata()
    .then((metadata) => metadata.format);
  if (imageType === "webp") {
    imageBuffer = await sharp(buffer).png().toBuffer();
  }
  const image = tf.node.decodeImage(imageBuffer, 3);
  return verifyImage(image);
};
const verifyImage = async (image) => {
  const model = await nsfw.load();
  const predictions = await model.classify(image);
  image.dispose();

  return predictions.some(
    (prediction) =>
      prediction.className === "Porn" && prediction.probability > 0.5,
  );
};
module.exports = { checkImageContent, checkVideoContent };
