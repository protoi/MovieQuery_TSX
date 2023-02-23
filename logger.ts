const { createLogger, format, transports } = require("winston");

const logger: any = createLogger({
  level: "debug",
  format: format.json(),
  transports: [new transports.Console()],
});

module.exports = { logger };
