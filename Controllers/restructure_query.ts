const restructure_mongo_response = (query: any) => {
  const leap_or_not = true;
  // console.dir(query, { depth: 2 });
  const month_names: any = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month_index_mappings: any = {
    January: { index: 0, days_in_month: 31 },
    February: { index: 1, days_in_month: leap_or_not ? 28 : 29 },
    March: { index: 2, days_in_month: 31 },
    April: { index: 3, days_in_month: 30 },
    May: { index: 4, days_in_month: 31 },
    June: { index: 5, days_in_month: 30 },
    July: { index: 6, days_in_month: 31 },
    August: { index: 7, days_in_month: 31 },
    September: { index: 8, days_in_month: 30 },
    October: { index: 9, days_in_month: 31 },
    November: { index: 10, days_in_month: 30 },
    December: { index: 11, days_in_month: 31 },
  };
  let data: any = month_names.map((m: any) => {
    return { month: m, monthly_query_count: 0, monthly_queries: [] };
  });

  query.forEach((element: any) => {
    if (element.days.length == 0) return;
    let monthly_query_count_temp = 0;
    let month_index = month_index_mappings[element.month].index;
    let month_days = month_index_mappings[element.month].days_in_month;

    data[month_index].monthly_queries = [...Array(month_days).keys()].map(
      (d: any) => {
        return {
          day: d + 1,
          daily_query_count: 0,
          daily_queries: [],
        };
      }
    );

    element.days.forEach((d: any) => {
      monthly_query_count_temp += d.documents.length;

      data[month_index].monthly_queries[d.day - 1] = {
        day: d.day,
        daily_query_count: d.documents.length,
        daily_queries: d.documents,
      };
    });
    data[month_index].monthly_query_count = monthly_query_count_temp;
  });
  return data;
};

module.exports = { restructure_mongo_response };
