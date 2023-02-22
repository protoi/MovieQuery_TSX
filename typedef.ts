/** WHATSAPP UTILS */

interface actor_list {
  male: string[];
  female: string[];
  others: string[];
}

interface number_message_tuple {
  num: string;
  msg: string;
}

interface movie_year_data {
  movie_name: string;
  release_year: string;
}

interface movie_actor_data {
  actor: actor_list;
  movie_name: string;
}

interface movie_genre_data {
  movie_name: string;
  genre: string[];
}

interface movie_information {
  title: string;
  genre: string[];
  release: string;
  rating: number;
}

interface movie_plot_data {
  title: string;
  plot: string;
}

interface whatsapp_payload {
  method: string;
  url: string;
  headers: { Authorization: string; "Content-Type": string };
  data: string;
}

/** ENTITY INTENT TUPLE OR SMTH */

interface entity_intent_tuple {
  entities: {
    genre: string[]; // can make it any later
    actor: actor_list;
    daterange: string[];
    moviename: string[];
  };
  intents: string;
  score: number;
}

interface movie_response_wrapper {
  movie_info: any;
  message_body: string;
}
