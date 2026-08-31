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
  
    const data = { "instruction": "Fill in the gaps", "type": "gapText", "gapText": "Farah {is} nice and her mother too.", "topics" : ["To be", "Adjectives", "Longer sentences"] , "options" : null };
    const response: AxiosResponse = await client.post(`/api/exercise`, data, config);
    console.log( response.data );
    console.log(response.status);
    console.log(response.data.json);    

    console.log(response.data.message );

  } catch(err) {
    console.log(err);
  }  
})();