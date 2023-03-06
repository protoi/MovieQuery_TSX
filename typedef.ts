/** WHATSAPP UTILS */

export interface actor_list {
  male: string[];
  female: string[];
  others: string[];
}

export interface number_message_tuple {
  num: any;
  msg: string;
}

export interface movie_year_data {
  movie_name: string;
  release_year: string;
}

export interface movie_actor_data {
  actors: actor_list;
  movie_name: string;
}

export interface movie_genre_data {
  movie_name: string;
  genre: string[];
}

export interface movie_information {
  title: string;
  genre: string[];
  release: string;
  rating: number;
}

export interface movie_plot_data {
  title: string;
  plot: string;
}

export interface whatsapp_payload {
  method: string;
  url: string;
  headers: { Authorization: string; "Content-Type": string };
  data: string;
}

/** ENTITY INTENT TUPLE OR SMTH */

export interface raw_entities {
  genre: string[];
  actor: string[];
  daterange: string[];
  moviename: string[];
}

export interface entities {
  genre: string[]; // can make it any later
  actor: string[];
  daterange: any;
  moviename: string;
}

export interface entity_intent_tuple {
  entities: raw_entities;
  intents: string;
  score: number;
}

export interface movie_response_wrapper {
  movie_info: any | null;
  message_body: string | null;
}


/**IMDB */

export interface genre_mapping {
  [key: string | number]: number | string;
}

export type actor_ID_mapping = Map<string, number | null>;
export type genre_ID_mapping = Map<string, string | number | null>;

export interface IMDB_queries {
  actor_ID_mapping: actor_ID_mapping | null;
  genre_ID_mapping: genre_ID_mapping | null;
  actor_string: string;
  genre_string: string;
  year: any;
}

/**KEYS */
interface IObjectKeys {
  [key: string]: string | number;
}
