const tf = require("@tensorflow/tfjs-node");
const nsfw = require("nsfwjs");

/**
 *
 * @param {Buffer} buffer
 * @returns {Promise<boolean>}
 */
const checkImageContent = async (buffer) => {
  const image = tf.node.decodeImage(buffer, 3);
  const model = await nsfw.load();
  const predictions = await model.classify(image);
  image.dispose();

  return predictions.some(
    (prediction) =>
      prediction.className === "Porn" && prediction.probability > 0.8,
  );
};

module.exports = checkImageContent;
