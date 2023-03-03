/**
 * @module API_source
 */
import { ClientRequest, request, ServerResponse } from "http";
import { Http2ServerRequest, Http2ServerResponse } from "http2";

const { Request, Response } = require("express");
const restructurer = require("./restructure_query");
const express = require("express");
let exp = express();
const { Logger } = require("winston");
const { logger } = require("../logger");
// const { aggregate } = require("../model");
const Query = require("../model");
const { MongoUtils } = require("../MongoUtils");

// const restructure_query_module = require("../Restructuring_Utils/restructure_date_query");
const mongoUtilsObject = new MongoUtils();

/**
 * extracts the intent from the Request Body and sends the documents from mongoDB as a HTTP Response that have matching intents
 * @function
 * @memberof module:API_source
 * @param {Request} request HTTP Request object
 * @param {Response} response HTTP Response object
 */
const get_document_on_the_basis_of_intents = async (
  request: any,
  response: any
) => {
  let query = null;
  let intent: string = request.query.intent;
  try {
    query = await Query.find({
      /* "EntityIntent_tuple": {
        "intents": "message.get_actor",
      }, */

      "EntityIntent_tuple.intents": intent,
    });
  } catch (err) {
    logger.error("Could not fetch data");
  }
  //console.log(query);
  try {
    response.send(query);
  } catch (error) {
    response.status(500).send(error);
  }
};

//This Function groups the documents on the basis of intents and gives their respective count
/**
 * Groups the documents on the basis of intents and sends their respective counts as a HTTP Response
 * @function
 * @memberof module:API_source
 * @param {Request} request HTTP Request Object
 * @param {Response} response HTTP Response Object
 */
const group_documents_by_intent = async (request: any, response: any) => {
  let query = null;
  try {
    query = await Query.aggregate([
      {
        $group: {
          _id: "$EntityIntent_tuple.intents",
          count: {
            $sum: 1,
          },
        },
      },
    ]);
    response.status(200).json(query);
  } catch (err: any) {
    logger.error("Could not fetch data");
    response.status(500).send(err.message);
  }
};

/**
 * returns any message matching the provided key to be filtered
 * @param request
 * @param response
 * @returns
 */
const get_breakdown = async (request: any, response: any) => {
  let query = null;
  const query_mapping: any = {
    genre: true,
    actor: true,
    moviename: true,
    plot: true,
  };
  if (
    request.query.key !== undefined &&
    request.query.value !== undefined &&
    query_mapping[request.query.key] !== undefined
  ) {
    try {
      switch (request.query.key) {
        case "genre":
          query = await Query.find({
            "EntityIntent_tuple.entities.genre": { $in: [request.query.value] },
          });
          break;
        case "actor":
          query = await Query.find({
            "EntityIntent_tuple.entities.actor": { $in: [request.query.value] },
          });
          break;
        case "moviename":
          query = await Query.find({
            "EntityIntent_tuple.entities.moviename": {
              $in: [request.query.value],
            },
          });
          break;
        case "plot":
          query = await Query.find({
            "EntityIntent_tuple.intents": "message.get_plot",
          });
          break;

        default:
          query = [];
          break;
      }
    } catch (err: any) {
      logger.error("Could not fetch data");
      response.status(500).send(err.message);
      return;
    }
    response.status(200).send(query);
    return;
  }

  response.status(500).send(null);
};

/**
 * Extracts the date formatted as YYYY/MM/DD and returns the weeks queries cumulatively grouped with respect to time (week, day, hour)
 * @function
 * @memberof module:API_source
 * @param {Request} request HTTP Response object containing a field called "date" containing a value of the format YYYY/MM/DD
 * @param {Response} response HTTP Response Object
 */
const group_queries_by_date_week = async (request: any, response: any) => {
  let start_date = null;
  let end_date = null;
  try {
    let date = new Date(request.query.date);
    let first = date.getDate() - date.getDay() + 1;
    let last = first + 6;
    let firstday = new Date(date.setDate(first)).toISOString();
    let lastday = new Date(date.setDate(last)).toISOString();
    start_date = firstday.substring(0, 10);
    end_date = lastday.substring(0, 10);
  } catch (err: any) {
    response.status(400).send(err.message);
    logger.error("Date format error");
    return;
  }

  /* console.log(start_date);
    console.log(end_date); */

  let query = null;
  try {
    query = await Query.aggregate([
      {
        $group: {
          _id: {
            $cond: [
              {
                $and: [
                  {
                    $gte: [
                      {
                        $dateToString: {
                          format: "%Y-%m-%d",
                          date: "$Time_Stamp",
                        },
                      },
                      start_date,
                    ],
                  },
                  {
                    $lte: [
                      {
                        $dateToString: {
                          format: "%Y-%m-%d",
                          date: "$Time_Stamp",
                        },
                      },
                      end_date,
                    ],
                  },
                ],
              },
              {
                $dateToString: {
                  format: "%Y/%m/%d",
                  date: "$Time_Stamp",
                },
              },
              "other",
            ],
          },
          docs: { $push: "$$ROOT" },
          count: { $sum: 1 },
        },
      },
    ]);
  } catch (err) {
    logger.error("Could not fetch data");
  }
  try {
    //query = mongoUtilsObject.restructure_query(query);
    response.send(query);
  } catch (error) {
    response.status(500).send(error);
  }
};

/**
 * Fetches the non-zero frequencies of all genres that have been queried
 * @function
 * @memberof module:API_source
 * @param {Request} request HTTP Response Object
 * @param {Response} response HTTP Response Object
 */
const get_genre_frequencies = async (request: any, response: any) => {
  let query = null;

  try {
    query = await Query.find(
      { "EntityIntent_tuple.entities.genre": { $ne: [] } },
      {
        "EntityIntent_tuple.entities.genre": 1,
        _id: 0,
      }
    );
  } catch (err: any) {
    logger.error("Could not fetch data");
    response.send(err.message);
    return;
  }
  let freq_map: any = new Map();
  query.forEach((element: any) => {
    let genre: string[] = element["EntityIntent_tuple"]["entities"]["genre"];
    genre.forEach((element) => {
      if (freq_map[element] == null) freq_map[element] = 1;
      freq_map[element]++;
    });
  });

  try {
    response.send(freq_map);
  } catch (error) {
    response.status(500).send(error);
  }
};

/**
 * Fetches the non-zero frequencies of all cast members that have been queried
 * @function
 * @memberof module:API_source
 * @param {Request} request HTTP Response Object
 * @param {Response} response HTTP Response Object
 */
const get_actor_frequencies = async (request: any, response: any) => {
  let query = null;

  try {
    query = await Query.find(
      { "EntityIntent_tuple.entities.actor": { $ne: [] } },
      {
        "EntityIntent_tuple.entities.actor": 1,
        _id: 0,
      }
    );
  } catch (err: any) {
    logger.error("Could not fetch data");
    response.send(err.message);
    return;
  }
  let freq_map: any = new Map();
  query.forEach((element: any) => {
    let actor = element["EntityIntent_tuple"]["entities"]["actor"];
    actor.forEach((element: any) => {
      if (freq_map[element] == null) freq_map[element] = 1;
      freq_map[element]++;
    });
  });

  try {
    response.send(freq_map);
  } catch (error) {
    response.status(500).send(error);
  }
};

/**
 * Fetches the non-zero frequencies of all movies that have been queried
 * @function
 * @memberof module:API_source
 * @param {Request} request HTTP Response Object
 * @param {Response} response HTTP Response Object
 */
const get_movie_frequencies = async (request: any, response: any) => {
  let query = null;

  try {
    query = await Query.find(
      { "EntityIntent_tuple.entities.moviename": { $ne: [] } },
      {
        "EntityIntent_tuple.entities.moviename": 1,
        _id: 0,
      }
    );
  } catch (err: any) {
    logger.error("Could not fetch data");
    response.send(err.message);
    return;
  }
  let freq_map: any = new Map();
  query.forEach((element: any) => {
    let moviename = element["EntityIntent_tuple"]["entities"]["moviename"];
    moviename.forEach((element: any) => {
      if (freq_map[element] == null) freq_map[element] = 1;
      freq_map[element]++;
    });
  });

  try {
    response.send(freq_map);
  } catch (error) {
    response.status(500).send(error);
  }
};

/**
 * Fetches the non-zero frequencies of all genres that have been queried
 * @function
 * @memberof module:API_source
 * @param {Request} request HTTP Response Object
 * @param {Response} response HTTP Response Object
 */
const group_documents_yearly_monthly_and_daily = async (
  request: any,
  response: any
) => {
  let query = null;
  let start_year = new Date("2023-01-01T00:00:00Z");
  let end_year = new Date("2024-01-01T00:00:00Z");
  try {
    query = await Query.aggregate([
      // Group by year, month, and day
      {
        $group: {
          _id: {
            year: { $year: "$Time_Stamp" },
            month: { $month: "$Time_Stamp" },
            day: { $dayOfMonth: "$Time_Stamp" },
          },
          documents: { $push: "$$ROOT" },
        },
      },
      // Group by year and month, and add a day field containing arrays of the documents for each day
      {
        $group: {
          _id: {
            year: "$_id.year",
            month: "$_id.month",
          },
          days: {
            $push: {
              day: "$_id.day",
              documents: "$documents",
            },
          },
        },
      },
      // Project the output to show year, month, and day arrays for each day
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id.month", 1] }, then: "January" },
                { case: { $eq: ["$_id.month", 2] }, then: "February" },
                { case: { $eq: ["$_id.month", 3] }, then: "March" },
                { case: { $eq: ["$_id.month", 4] }, then: "April" },
                { case: { $eq: ["$_id.month", 5] }, then: "May" },
                { case: { $eq: ["$_id.month", 6] }, then: "June" },
                { case: { $eq: ["$_id.month", 7] }, then: "July" },
                { case: { $eq: ["$_id.month", 8] }, then: "August" },
                { case: { $eq: ["$_id.month", 9] }, then: "September" },
                { case: { $eq: ["$_id.month", 10] }, then: "October" },
                { case: { $eq: ["$_id.month", 11] }, then: "November" },
                { case: { $eq: ["$_id.month", 12] }, then: "December" },
              ],
            },
          },
          days: 1,
        },
      },
    ]);
  } catch (error: any) {
    logger.error(error.message);
  }

  try {
    // console.log((query));
    // response.send(query);
    response.send(restructurer.restructure_mongo_response(query));
  } catch (error) {
    response.status(500).send(error);
  }
};

//Exporting the required functions
module.exports = {
  get_document_on_the_basis_of_intents,
  group_queries_by_date_week,
  get_genre_frequencies,
  group_documents_by_intent,
  get_actor_frequencies,
  get_movie_frequencies,
  group_documents_yearly_monthly_and_daily,
  get_breakdown,
};

export {};
