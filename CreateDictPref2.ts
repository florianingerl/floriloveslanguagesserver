import axios, { AxiosResponse, AxiosRequestConfig, RawAxiosRequestHeaders } from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:8080',
});


(async () => {
  const config: AxiosRequestConfig = {
    headers: {
      'Accept': 'application/json',
    } as RawAxiosRequestHeaders,
  };

  try {
    /*
    dictUrl: string;
    userEmail : string;
    lg: string;*/
    const data = {
    "userEmail": "martin@gmx.de",
    "lg": "deutsch",
    "dictUrl": "https://www.wordreference.com/defr/"
};
 //   const data = { "dictUrl": "https://www.oxford.com", "userEmail": "sonja@gmx.de", "lg": "english" };
    const response: AxiosResponse = await client.post(`/api/updateOrCreateDictionaryPref`, data, config);
    console.log( response.data );
    console.log(response.status);
    console.log(response.data.json);    

    console.log(response.data.message );

  } catch(err) {
    console.log(err);
  }  
})();