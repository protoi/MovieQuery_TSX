/**
 * Utility functions to restructure the queries from just time stamps to a cascade of days (7) and hours (24)
 * @class
 */

class MongoUtils {
  weekday = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  /**
   * Fixes formatting for restructurd query Object
   * @param {Object} data Restructured Query
   * @returns {Array.<Object>}
   */

  reStructurer(data: any) {
    // console.log(ty)

    for (let day of this.weekday) {
      // Check if the current day is already in the data array
      let existingDay = data.find((d : any) => d.day === day);

      // If it's not, add it with queries = 0 and an empty daily_queries array
      if (!existingDay) {
        data.push({ day: day, queries: 0, daily_queries: [] });
      }
    }

    // Sort the data array by day of the week
    data.sort(
      (a: any, b: any) => this.weekday.indexOf(a.day) - this.weekday.indexOf(b.day)
    );

    // First, create a new array with all 24 hours represented
    let allHours = Array.from(Array(24).keys()).map((h) => h.toString());

    data.forEach((element: any) => {
      if (element.queries == 0) return;
      let queryData = element.daily_queries;
      // If not, add a new object for that hour with queries set to 0 and an empty hourly_queries array.
      allHours.forEach((hour) => {
        let hourExists = queryData.some((obj: any) => obj.hour === hour);
        if (!hourExists) {
          queryData.push({
            hour: hour,
            queries: 0,
            hourly_queries: [],
          });
        }
      });

      // Finally, sort the query data array by hour to ensure it's in the correct order.
      queryData.sort((a: any, b: any) => a.hour - b.hour);

      element.daily_queries = queryData;
    });
  }

  /**
   * Restructures the raw mongoDB query object to be useable by the front-end
   * @param {Object} query MongoDB Response object
   * @returns {Array.<Object>}
   */
  restructure_query(query: any) {
    //removing the other _id values

    query = query.filter((obj: any) => obj._id !== "other");

    //Placing the query object elements in an array

    let arr: any [] = [];
    query.forEach((element: any) => {
      arr.push(element);
    });

    arr.sort(
      (element1: any, element2: any) => new Date(element1._id).getTime() - new Date(element2._id).getTime()
    );

    //Restructured data
    let restructured_arr: any[] = [];

    arr.forEach((element) => {
      //The re structured element that is going to be part of output array
      let restructured_element: any = {};

      //Converting date from yyyy/mm/dd format to this.weekday

      let day: string = this.weekday[new Date(element._id).getDay()];
      restructured_element.day = day;

      //In doc_array we put the docs array of each element
      let doc_array: any = [];
      element.docs.forEach((elements : any) => {
        doc_array.push(elements);
      });

      let queries = doc_array.length;
      restructured_element.queries = queries;
      let daily_queries: any[] = [];

      let hour_wise_docs: any = {};

      //From the doc array elements we extract out th erequired fields for our response format

      doc_array.forEach((elements: any) => {
        let hour = new Date(elements.Time_Stamp).getHours();
        let temp_obj: any = {};
        temp_obj.timestamp = elements.Time_Stamp;
        let obj: any = {};
        obj.entity = elements.EntityIntent_tuple.entities;
        obj.intent = elements.EntityIntent_tuple.intents;
        obj.Actual_Message = elements.Query_Message;
        obj.Response_Message = elements.Response_Body;
        temp_obj.data = obj;
        if (!hour_wise_docs[hour]) {
          hour_wise_docs[hour] = [temp_obj];
        } else {
          hour_wise_docs[hour].push(temp_obj);
        }
      });

      //From the hour_wise_docs we build the daily_queries

      let hours = Object.keys(hour_wise_docs);
      hours.forEach((hour) => {
        let obj:any = {};
        obj.hour = hour;
        obj.queries = hour_wise_docs[hour].length;
        obj.hourly_queries = hour_wise_docs[hour];

        daily_queries.push(obj);
      });
      //console.log(hours);
      //console.log(hour_wise_docs);
      restructured_element.daily_queries = daily_queries;
      restructured_arr.push(restructured_element);
    });
    this.reStructurer(restructured_arr);
    return restructured_arr;
  }
}

module.exports = { MongoUtils };
