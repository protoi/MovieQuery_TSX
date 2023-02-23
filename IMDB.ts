const WhatsappUtils = require("./WhatsappUtils");
const WhatsappUtilsObj = new WhatsappUtils.WhatsappUtils();
import {
  genre_mapping,
  actor_ID_mapping,
  genre_ID_mapping,
  actor_list,
  entities,
  IMDB_queries,
  movie_response_wrapper,
  entity_intent_tuple,
  raw_entities,
} from "./typedef";

const axios = require("axios");
require("dotenv").config();

/** Class containing utilities to query the TIMDB database
 * @class
 */

class IMDB {
  genre_mapping: genre_mapping;
  genre_mapper_initialized: boolean;

  constructor() {
    this.genre_mapping = {};
    this.genre_mapper_initialized = false;
    this.genre_ID_pre_mapping();
  }

  /**
   *  Maps genres with their IDs and vice versa for quick look-up
   * @async
   */
  async genre_ID_pre_mapping() {
    try {
      let config = {
        method: "get",
        url: `https://api.themoviedb.org/3/genre/movie/list?api_key=${process.env.THE_MOVIE_DB_KEY}`,
        headers: {},
      };
      const genre_ID_response = await axios(config);

      genre_ID_response.data["genres"].forEach(
        /**
         * Maps Genre to it's ID and vice verse for bi-directional lookup
         * @param {string} element
         */
        (element: any) => {
          this.genre_mapping[element["name"].toLowerCase()] = element["id"];
          this.genre_mapping[element["id"]] = element["name"].toLowerCase();
        }
      );
      this.genre_mapper_initialized = true;
      // console.log(this.genre_mapping);
      // return true;
    } catch (err: any) {
      console.error(`Failed to map genres: ${err.message}`);
      // return null;
    }
  }

  /**
   * Function to map an actor with their corresponding IMDB ID. The actor will be mapped with null if their ID is not found
   * @param {Array.<string>} actor_names an array of strings, which are the cast names
   * @returns {Map<string, (number|null)>} mapping of actor name with ID
   */
  async map_actors_with_ID(
    actor_names: string[]
  ): Promise<actor_ID_mapping | null> {
    const actor_ID_mapping: actor_ID_mapping = new Map(); //might have to make the ID a string aswell

    for (let index = 0; index < actor_names.length; index++) {
      const actor_name = actor_names[index];

      try {
        let config = {
          method: "get",
          url: `https://api.themoviedb.org/3/search/person?api_key=${process.env.THE_MOVIE_DB_KEY}&query=${actor_name}`,
          headers: {},
        };

        const actor_response: any = await axios(config);

        if (actor_response.data.results.length != 0) {
          actor_ID_mapping.set(
            actor_name,
            actor_response.data.results[0]["id"]
          );
          console.log(
            `mapping actor = ${actor_name} with ID = ${actor_response.data.results[0]["id"]}`
          );
        } else actor_ID_mapping.set(actor_name, null);
      } catch (err: any) {
        console.error(`failed to map ${actor_name} ----> ${err.message}`);
      }
    }
    return actor_ID_mapping;
  }

  /**
   * Maps the string genre list to it's corresponding IMDB ID. The ID can be null if genre cannot be mapped
   * @param {Array.<String>} genre_names an array of strings which are genres
   * @returns {Map<string, number>} mapping between genre and it's unique ID
   */
  map_genres_with_ID(genre_names: string[]): genre_ID_mapping {
    const genre_ID_mapping: genre_ID_mapping = new Map();

    genre_names.forEach(
      /**
       * Maps a single Genre with it's ID by referencing the class variable genre_mapping
       * @param {string} genre
       */
      (genre: string) => {
        if (this.genre_mapping[genre] != null)
          genre_ID_mapping.set(genre, this.genre_mapping[genre]);
        else genre_ID_mapping.set(genre, null);
      }
    );
    return genre_ID_mapping;
  }

  /**
   * returns an array of strings which is the genre strings associated with the genre IDs
   * @param {Array.<(number|null)>} genre_IDs Array of integers, can contain null values.
   * @returns {Array.<string>} an array of strings corresponding to an ID's genre name.
   */
  get_genre_from_IDs(genre_IDs: (number | null)[]) {
    return genre_IDs
      .map(
        /**
         * maps a unique ID with the corresponding genre
         * @param {number} id Unique ID to be mapped
         * @returns {(string|null)}
         */
        (id) => {
          if (id === null) return null;
          console.log(this.genre_mapping[id]);
          return this.genre_mapping[id] || null;
        }
      )
      .filter(
        /**
         * Filters null elements
         * @param {(string|null)} element Name of genre
         * @returns {boolean}
         */
        (element) => {
          return element != null;
        }
      );
  }

  /**
   * Look up movie by it's name
   * @param {string} movie_name name of the movie to be looked up
   * @returns {(Object|null)} detailed information about the movie being looked up, can be null if such a movie is not found
   */
  async find_movie_info(movie_name: string): Promise<Object | null> {
    let config = {
      method: "get",
      url: `https://api.themoviedb.org/3/search/movie?api_key=${process.env.THE_MOVIE_DB_KEY}&language=en-US&query=${movie_name}&page=1&include_adult=false`,
      headers: {},
    };
    try {
      let tmdb_response = await axios(config);
      if (
        tmdb_response.data.total_results == 0 ||
        tmdb_response.data.total_results == null
      ) {
        return null;
      }
      return tmdb_response.data.results[0];
    } catch (err: any) {
      console.error(`${err.message}`);
      return null;
    }
  }

  /**
   *  male, female and other gender cast members from a movie ID
   * @param {number} movie_id unique ID IMDB for a given movie
   * @returns {Object.<string, Array.<string>>} returns an object containing three arrays of strings, male, female and other gender cast members, will return null if no such movie is found
   */
  async get_cast_from_movie_id(movie_id: number): Promise<actor_list | null> {
    let config = {
      method: "get",
      url: `https://api.themoviedb.org/3/movie/${movie_id}/credits?api_key=${process.env.THE_MOVIE_DB_KEY}&language=en-US`,
      headers: {},
    };
    try {
      let cast_response: any = await axios(config);
      // console.log(cast_response.data.id);
      let cast: actor_list = { male: [], female: [], others: [] };
      cast_response.data.cast.forEach((element: any) => {
        if (element.gender == 1) cast.female.push(element.original_name);
        else if (element.gender == 2) cast.male.push(element.original_name);
        else cast.others.push(element.original_name);
      });
      return cast;
    } catch (err: any) {
      console.log(err.message);
      return null;
    }
  }

  /**
   *  queries the IMDB API for IDs of the actors and genres
   * @async
   * @param {Object} search_terms object containing actor list, genre list, date and movie name, all of these can be null values
   * @returns {Object} returns an object with Maps of actor/genre and their IDs, stringified actor/genre IDs and the year mentioned
   */
  async find_queries(search_terms: raw_entities): Promise<IMDB_queries> {
    /**
     * Turns the actor id or genre id mapping into a string of comma separated IDs
     * @inner
     * @function
     * @param {Map<string, number>} entity_map a Mapping of either (actor, actorID) or (genre, genreID)
     * @returns {string} stringified comma separated actorIDs or genreIDs, excludes the null values
     */
    const join_and_stringify_IDs = (
      entity_map: genre_ID_mapping | actor_ID_mapping
    ) => {
      // console.log("stringifying now");
      return Array.from(entity_map.values())
        .filter(
          /**
           * Filters any map key:value pair with value = null
           * @param {string} element the Key of the map
           * @returns {boolean}
           */
          (element) => {
            return element != null;
          }
        )
        .join(",");
    };

    let actor_id_string: string = "";
    let genre_id_string: string = "";
    let actor_IDs: actor_ID_mapping | null = null;
    let genre_IDs: genre_ID_mapping | null = null;
    let year: any = null;

    let actor_names = search_terms["actor"];
    console.log(`actor -------> ${actor_names}`);
    let genre_names = search_terms["genre"];
    console.log(`genre -------> ${genre_names}`);

    try {
      //generating the genre mappings and forming a comma separated string
      genre_IDs = await this.map_genres_with_ID(genre_names);
      if (genre_IDs != null)
        genre_id_string = join_and_stringify_IDs(genre_IDs); // {"a":1, "b":2, "c":null, "d":4} ---> "1,2,4"

      //mapped actors with their corresponding IDs
      //turning the ID map into a comma separated string
      actor_IDs = await this.map_actors_with_ID(actor_names);
      if (actor_IDs != null) {
        actor_id_string = join_and_stringify_IDs(actor_IDs);
      }
      // console.log(`actor_IDs ----->  ${actor_IDs}`);
      // console.log(`genre_id_string ----->  ${genre_id_string}`);
      // console.log(`actor_id_string ----->  ${actor_id_string}`);
    } catch (err: any) {
      console.error(err.message);
    }
    console.log(search_terms["daterange"]);
    return {
      actor_ID_mapping: actor_IDs,
      genre_ID_mapping: genre_IDs,
      actor_string: actor_id_string,
      genre_string: genre_id_string,
      year: search_terms["daterange"][0],
    };
  }
  /**
   * Checks for movie name, returns movie info and message body
   * @async
   * @param {string} movie_name supposed name of the movie to be queries, can be null
   * @returns {(Object|null)} movie_info, message_body. ||||| message_body = null if movie found else contains a response
   */
  async get_movie_info(
    movie_name: string | null
  ): Promise<movie_response_wrapper> {
    // let movie_name = movie_name;
    let message_body = null;
    let movie_info = null;
    // let movie_name = null;

    let movie_response_wrapper: movie_response_wrapper = {
      movie_info: movie_info,
      message_body: message_body,
    };
    if (movie_name == null) {
      console.log("Movie name not detected, possibly due to lack of quotes");
      //also send the user that they need to specify a movie in double/single quotes
      movie_response_wrapper.message_body =
        "Please enclose the name of the movie in double/single quotes";
      return movie_response_wrapper;
    }
    // removes anything except digits, alphabets and spaces
    movie_name = movie_name.replace(/[^\w ]/gm, "");
    try {
      movie_info = await this.find_movie_info(movie_name);

      if (movie_info == null) {
        console.log(`movie named ${movie_name} not found`);
        movie_response_wrapper.message_body = `movie named ${movie_name} not found`;
        return movie_response_wrapper;
      }
      // no issues found,
      movie_response_wrapper.movie_info = movie_info;
      movie_response_wrapper.message_body = null;
      return movie_response_wrapper;
    } catch (err: any) {
      console.log(err.message);
      return movie_response_wrapper;
    }
  }

  /**
   * sends a GET request to the IMDB API /discover/
   * @async
   * @param {Object} entities object containing Maps of actor/genre and their IDs, stringified actor/genre IDs and a year
   * @returns {Array.<Object>} array of objects containing detailed movie informations
   */
  async GET_movie_names_using_genre_and_actor(
    entities: IMDB_queries
  ): Promise<any> {
    // send GET request to discover
    let imdb_data: any = null;
    try {
      let config = {
        method: "get",
        url: `https://api.themoviedb.org/3/discover/movie?primary_release_year=${entities.year}&with_genres=${entities.genre_string}&with_people=${entities.actor_string}&sort_by=popularity.desc&api_key=${process.env.THE_MOVIE_DB_KEY}`,
        headers: {},
      };

      imdb_data = (await axios(config)).data.results;

      return imdb_data;
    } catch (err: any) {
      console.error(err.message);
    }
    // console.table(movie_names);
    return imdb_data;
  }

  /**
   * Takes an object containing the entities and the intent classified and performs different actions based on that information.
   * 1. The end result is an object containing the entities identified
   * 2. The information about the movie if it was supposed to be queried
   * 3. The raw message to be send to the user
   * @param {Object} entityIntentContainer
   * @returns {Object.<string, (Object|Object|string)>}
   */
  async get_movie_query_from_intents(
    entityIntentContainer: entity_intent_tuple
  ) {
    let entity_valuelist = null;
    let { movie_info, message_body } = await this.get_movie_info(
      entityIntentContainer.entities.moviename[0]
    );

    switch (entityIntentContainer.intents) {
      case "message.get_movie":
        // logger.debug("Intent - getting movies from quey");
        const movie_queries = await this.find_queries(
          entityIntentContainer.entities
        );

        movie_info = await this.GET_movie_names_using_genre_and_actor(
          movie_queries
        );

        const top3_movie_list: any[] = [];

        for (let index = 0; index < Math.min(3, movie_info.length); index++) {
          const movie = movie_info[index];
          top3_movie_list.push({
            title: movie.original_title,
            poster: movie.backdrop_path,
            genre: await this.get_genre_from_IDs(movie.genre_ids),
            release: movie.release_date,
            rating: movie.vote_average,
          });
        }

        message_body = WhatsappUtilsObj.generate_body_movie(top3_movie_list);
        // log the message_body here
        break;

      case "message.get_genre":
        if (message_body != null) break;
        let genre_list = await this.get_genre_from_IDs(movie_info.genre_ids);
        entity_valuelist = genre_list;
        message_body = WhatsappUtilsObj.generate_body_genre({
          movie_name: movie_info.original_title,
          genre: genre_list,
        });
        // logger.debug("Intent - getting genre from query");
        break;
      case "message.get_actor":
        if (message_body != null) break;
        let actor_list = await this.get_cast_from_movie_id(movie_info.id);
        entity_valuelist = actor_list;
        message_body = WhatsappUtilsObj.generate_body_actor({
          movie_name: movie_info.original_title,
          actors: actor_list,
        });
        // logger.debug("Intent - getting actor list from query");
        break;
      case "message.get_movie_year":
        if (message_body != null) break;
        message_body = WhatsappUtilsObj.generate_body_movie_year({
          movie_name: movie_info.original_title,
          release_year: movie_info.release_date,
        });
        // logger.debug("Intent - getting release year from query");
        break;
      case "message.get_plot":
        if (message_body != null) break;
        message_body = WhatsappUtilsObj.generate_body_plot({
          title: movie_info.original_title,
          plot: movie_info.overview,
        });
        // logger.debug("Intent - getting plot from query");
        break;

      default:
        message_body = "failed to detect intent";
        // logger.error("Failed to detect intent ");
        break;
    }
    return { movie_info, message_body, entity_valuelist };
  }
}
module.exports = { IMDB };
