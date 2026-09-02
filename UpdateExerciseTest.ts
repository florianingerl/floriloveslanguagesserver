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
  
    const data = { "instruction": "Fill in the gaps", "type": "gapText", "gapText": "Farah {is} nice and her father too.", "topics" : ["To be", "Adjectives", "Longer sentences"] , "options" : null };
    const objectId = "6a8fd750be5dfba2464ceb52";
    const response: AxiosResponse = await client.put(`/api/exercise/${objectId}`, data, config);
    console.log( response.data );
    console.log(response.status);
    console.log(response.data.json);    

    console.log(response.data.message );

  } catch(err) {
    console.log(err);
  }  
})();