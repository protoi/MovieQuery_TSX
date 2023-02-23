// const { default: axios } = require("axios");
const axios = require("axios");
const { logger } = require("./logger");
import {
  number_message_tuple,
  movie_year_data,
  movie_actor_data,
  movie_genre_data,
  movie_information,
  movie_plot_data,
  whatsapp_payload,
} from "./typedef";
/**
 * WhatsApp Utilities class that contains helper functions to generate message payloads and send messages to the whatsapp server
 * @class
 */
class WhatsappUtils {
  /**
   * Extracts Mobile number and received message from the user.
   * @param {Object} payload the whatsapp webhook message
   * @returns {Object|null} if successful it will return an object containing the number and message of the sender otherwise it will return null
   */
  extract_number_and_message(payload: any): number_message_tuple | null {
    console.log(JSON.stringify(payload, null, 2));
    try {
      const number: string =
        payload.entry[0].changes[0].value["messages"][0]["from"];
      const message: string =
        payload.entry[0].changes[0].value["messages"][0]["text"]["body"];

      console.log(`number -> ${number}, message -> ${message}`);

      const num_msg_tuple: number_message_tuple = { num: number, msg: message };
      return num_msg_tuple;
    } catch (err) {
      return null;
    }
  }

  /**
   * generates a message to be sent to whatsapp upon the intent message.get_movie_year
   * @param {Object} data object containing the movie name and it's release year
   * @returns {String|null} reponse string to be sent to whatsapp otherwise null if some error is detected
   */
  generate_body_movie_year(data: movie_year_data): string | null {
    try {
      return `${data.movie_name} was released in ${data.release_year}.`;
    } catch (err: any) {
      console.log(err.message);
      return null;
    }
  }

  /**
   * generates a message to be sent to whatsapp upon the intent message.get_actor
   * @param {Object} data object containing the movie name and three lists (male, female and other gender) cast members.
   * @returns {String|null} response string to be sent to whatsapp, the lists will be top 5 cast members in their category
   */
  generate_body_actor(data: movie_actor_data): string | null {
    try {
      let male_list = `Actors: ${data.actors.male.slice(0, 5).join(", ")}`;
      let female_list = `Actress: ${data.actors.female.slice(0, 5).join(", ")}`;
      let other_list = `Others: ${data.actors.others.slice(0, 5).join(", ")}`;

      return `Cast of ${data.movie_name}:\n${male_list}.\n${female_list}.\n${other_list}.`;
    } catch (err: any) {
      console.log(err.message);
      return null;
    }
  }

  /**
   * generates a message to be sent to whatsapp upon the intent message.get_genre
   * @param {Object} data object containing the movie name and it's list of genres
   * @returns {String|null}  response string to be sent to whatsapp, it is a comma separated list of genres for that movie
   */
  generate_body_genre(data: movie_genre_data): string | null {
    try {
      return `Genre of ${data.movie_name} is:\n${data.genre.join(".\n")}.`;
    } catch (err: any) {
      console.log(err.message);
      return null;
    }
  }

  /**
   * generates a message to be sent to whatsapp upon the intent message.get_movie
   * @param {Array} data  Array of objects containing detailed information about the movies
   * @returns {String|null} response string to be sent to whatsapp, it contains the movie name, it's genres, release date and rating out of 10
   */
  generate_body_movie(data: movie_information[]): string | null {
    try {
      /* console.log(
        `DATA --- > \n\n${JSON.stringify(data, null, 2)}\n==============`
      ); */
      if (data.length == 0) {
        return "no movies like that found";
      }
      return data
        .map((movie) => {
          return `*${movie.title}*\n${movie.genre.join(", ")}\nRelease Date: ${
            movie.release
          }\nRating: ${movie.rating}`;
        })
        .join("\n\n");
    } catch (err: any) {
      console.log(err.message);
      return null; // newly added, had no return here before
      // return "no movies like that found";
    }
  }

  /**
   * generates a message to be sent to whatsapp upon the intent message.get_plot
   * @param {Object} data object containing the title of the movie and it's summary/plot
   * @returns {String|null} response string to be sent to whatsapp, it contains the full summary of the requested movie
   */
  generate_body_plot(data: movie_plot_data): string | null {
    try {
      return `${data.title}:\n${data.plot}`;
    } catch (err: any) {
      console.log(err.message);
      return null;
    }
  }

  /**
   * returns an Object which is to be used by axios to send a message to the whatsapp API directed towards the user
   * @param {number} number mobile number of the query sender
   * @param {String} message_body raw message to be sent to the user
   * @returns {Object|null}  Object to be sent to the whatsapp API as a HTTP POST request
   */
  generate_payload(
    number: number | string,
    message_body: string
  ): whatsapp_payload | null {
    try {
      const reply_body = JSON.stringify({
        messaging_product: "whatsapp",
        to: number,
        type: "text",
        text: {
          body: message_body,
        },
      });

      const config = {
        method: "post",
        url: "https://graph.facebook.com/v15.0/101012232928194/messages",
        headers: {
          Authorization: `Bearer ${process.env.TOKEN}`,
          "Content-Type": "application/json",
        },
        data: reply_body,
      };
      return config;
    } catch (err: any) {
      console.log(err.message);
      return null;
    }
  }

  /**
   * Sends a message to the specified user
   * @async
   * @param {String} payload
   * @returns {boolean} whether the action was successfully performed or not
   */
  async send_message_to_whatsapp(payload: string): Promise<boolean> {
    try {
      await axios(payload);
      logger.debug("Message sent successfully");
      return true;
    } catch (err) {
      logger.error("Something went wrong while sending the message");
      return false;
    }
  }
}

module.exports = { WhatsappUtils };
