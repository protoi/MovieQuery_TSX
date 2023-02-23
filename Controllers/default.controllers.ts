const {Request, Response} = require("express");
/**
 * Responds with "Hello World"
 * @param {Request} req HTTP Response Object
 * @param {Response} res HTTP Response Object
 */
const ping = (req: any, res: any) => {
  res.send("Hello World");
};

module.exports = { ping };

export { };