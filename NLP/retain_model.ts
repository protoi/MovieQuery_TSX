const fs = require("fs");
const { NlpManager } = require("node-nlp");
const path = require("path");
import { raw_entities, entity_intent_tuple } from "../typedef";
/**
 * Creates a NLP class
 * @class
 */
class NLP {
  SCORE_THRESHOLD: number;
  model_finished_loading: boolean;
  manager: any;
  constructor() {
    this.SCORE_THRESHOLD = 0.5;
    this.model_finished_loading = false;
    this.manager = new NlpManager();
    this.load_model();
  }
  /**loads "mymodel.nlp" model from the file directory*/
  load_model() {
    const file = path.join(process.cwd(), "NLP", "mymodel.nlp");
    const data = fs.readFileSync(file, "utf8");
    this.manager.import(data);
    this.model_finished_loading = true;
  }

  /**
   * extracts entities, intents and probability of intent from a given string
   * @param {String} message the message for whom the intents and entities are to be extracted
   * @returns {Object.<String, Object.<String, (Object.<string, Array.<(string|number)>>|string|number)>>} returns an object containing the entities, intent and the probability of said intent
   */
  async extract_characteristics(message: string) {
    const result: any = await this.manager.process("en", message);

    let our_entities: raw_entities = {
      genre: [],
      actor: [],
      daterange: [],
      moviename: [],
    };

    console.dir(result, { depth: null });

    result.entities.forEach((element: any) => {
      let entity_type: string = element["entity"];
      if (our_entities[entity_type as keyof raw_entities] != null) {
        if (entity_type === "daterange")
          our_entities[entity_type].push(element["resolution"]["timex"]);
        else if (entity_type === "moviename")
          our_entities[entity_type].push(element["sourceText"]);
        else
          our_entities[entity_type as keyof raw_entities].push(
            element["option"]
          );
      }
    });

    const entity_intent_tuple: entity_intent_tuple = {
      entities: our_entities,
      intents: result.classifications[0]?.intent,
      score: result.classifications[0]?.score,
    };
    return entity_intent_tuple;
  }
}

module.exports = { NLP };
