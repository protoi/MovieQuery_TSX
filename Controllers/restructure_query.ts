const restructure_mongo_response = (query: any) => {
  const months = [
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
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  let restructured_response: any = [];

  let month_count_map = new Map();
  for (let i = 0; i < 12; i++) {
    month_count_map.set(months[i], 0);
  }
  query.forEach((element: any) => {
    let month = element.month;
    let sum = 0;
    element.days.forEach((element1: any) => {
      sum += element1.day;
    });
    month_count_map.set(month, sum);
  });

  for (let i = 0; i < 12; i++) {
    let monthly_element: any = {};
    monthly_element.month = months[i];
      monthly_element.monthly_count = month_count_map.get(months[i]);
      monthly_element.monthly_queries = [];
      query.forEach((element1: any) => {
          if (element1.month === months[i])
          {
              let monthly_query: any = {};
              
            }
      });
    restructured_response.push(monthly_element);
  }
};
