const axios = require("axios");
const { Request, Response } = require("express");
const { logger } = require("../logger");
//our classes
const nlp_model = require("../NLP/retain_model");
const WhatsappUtils = require("../WhatsappUtils");
const IMDB = require("../IMDB");
const Query = require("../model");
const default_messages = require("./default_intent_example.json");

import { entity_intent_tuple } from "../typedef";

//Objects
const WhatsappUtilsObj = new WhatsappUtils.WhatsappUtils();
const IMDBObj = new IMDB.IMDB();
const model = new nlp_model.NLP();

let mongo_payload: any = {};

let error_flag: boolean = false;

require("dotenv").config();

const PORT: number = 9999;

/**
 * Verifies the token sent during Whatsapp Webhook initialization
 * @param {Request} req HTTP Request Object
 * @param {Response} res HTTP Response Object
 */
const verify_token = (req: any, res: any) => {
  if (req.query["hub.verify_token"] == process.env.SECRET) {
    logger.debug("Token Verified");
    res.send(req.query["hub.challenge"]);
  } else res.sendStatus(403);
};

/**
 * Obtains mobile number and message from the Request body passed down from the middleware and calls the NLP libraries and sends an appropriate response to the user
 * @param {Request} request HTTP Response Object
 * @param {Response} response HTTP Response Object
 * @returns {}
 */
const fetch_info_and_post_to_whatsapp = async (req: any, res: any) => {
  let num: string, msg: string;
  num = req.num_msg_tuple.num;
  msg = req.num_msg_tuple.msg;

  logger.debug(`Extracted message : ${msg} `);
  logger.debug(`Destination Phone number : ${num}`);

  //Adding Number and Message to mongodb payload

  mongo_payload.Destination_Phone_number = num;
  mongo_payload.Query_Message = msg;

  let movie_info: any = null;
  let message_body: string = "";

  let EntityIntent_tuple: any = null;
  let entity_valuelist: any = null;

  try {
    EntityIntent_tuple = await model.extract_characteristics(msg);

    console.log(EntityIntent_tuple.entities);
    console.log(EntityIntent_tuple.intents);

    logger.debug(`Entitites extraced : \n ${EntityIntent_tuple.entities}`);
    logger.debug(
      `Intent extraced : ${EntityIntent_tuple.intents} with probability: ${EntityIntent_tuple.score}`
    );

    /* if (EntityIntent_tuple.score < model.SCORE_THRESHOLD) {
      error_flag = true;
      const payload = WhatsappUtilsObj.generate_payload(
        num,
        "I donot understand, please try another message."
      );
      try {
        const success = await WhatsappUtilsObj.send_message_to_whatsapp(
          payload
        );
        logger.debug(`success status: ${success}`);
        res.sendStatus(200);
      } catch (err: any) {
        logger.error(
          `something went wrong trying to send intent failure message to user ${err.message}`
        );
        res.sendStatus(403);
      }
    } */
  } catch (err: any) {
    EntityIntent_tuple = null;
    console.error(`entity and intent extraction failed: ${err.message}`);
  }

  //Adding Enitity and Intent to mongodb payload
  mongo_payload.EntityIntent_tuple = EntityIntent_tuple;

  if (EntityIntent_tuple != null) {
    try {
      if (EntityIntent_tuple.score < model.SCORE_THRESHOLD) {
        error_flag = true;
        message_body = "I donot understand, please try another message.";
      } 
      else if (EntityIntent_tuple.intents === "message.greetings") {
        message_body = `Greetings!
If you have any questions about movies, feel free to ask me as I am the Movie Bot with extensive knowledge from TMDB.
Here are a few examples of what you can ask:
- "Can you provide me with the list of actors in 'Superman Returns'?"
- "Do you happen to know the year in which 'Sholay' was released?"
- "What are some of Sylvester Stallone's action movies?"
- "Show me the plot of 'Rise of the planet of the apes'
- Tell me the cast of 'Jaws'
- What are the genres of 'Spirited Away'
If you need help just type "hello"`;
      }else if (
        EntityIntent_tuple.entities.genre.length == 0 &&
        EntityIntent_tuple.entities.actor.length == 0 &&
        EntityIntent_tuple.entities.daterange.length == 0 &&
        EntityIntent_tuple.entities.moviename.length == 0
      ) {
        message_body = "Please try something like this:";
        let identified_intent = EntityIntent_tuple.intents;
        message_body += " " + default_messages[identified_intent];
        error_flag = true;
      } else {
        ({ movie_info, message_body, entity_valuelist } =
          await IMDBObj.get_movie_query_from_intents(EntityIntent_tuple));
      }
    } catch (err: any) {
      console.error(
        `could not fetch movie information or response message: ${err.message}`
      );
    }
  }

  //Adding Response Body to mongodb payload
  mongo_payload.Response_Body = message_body;
  mongo_payload.Entity_valuelist = entity_valuelist;

  if (message_body == null) {
    message_body = "oh no, something went wrong";
    error_flag = true;
  }
  mongo_payload.Time_Stamp = Date();
  console.log(mongo_payload);

  const payload = WhatsappUtilsObj.generate_payload(num, message_body);
  console.log(payload);

  const success = await WhatsappUtilsObj.send_message_to_whatsapp(payload);

  if (error_flag == true) {
    error_flag = false;
    mongo_payload.EntityIntent_tuple.intents = "message.error";
  }


  const query = new Query(mongo_payload);
  //res.sendStatus(200);

  try {
    await query.save();
    res.send(query);
  } catch (error) {
    console.log("Here");
    //res.send(error);
    res.status(500).send(error);
    //return;
  }

  /* console.log(`===========BODY===========\n${message_body}`);
  console.log(`success status: ${success}`); */

  //res.sendStatus(200);
};

module.exports = {
  // ping,
  verify_token,
  fetch_info_and_post_to_whatsapp,
  WhatsappUtilsObj,
  IMDBObj,
  model,
};

export {};
