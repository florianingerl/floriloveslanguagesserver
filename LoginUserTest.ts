import axios, { AxiosResponse, AxiosRequestConfig, RawAxiosRequestHeaders } from 'axios';

const client = axios.create({
  baseURL: 'https://jagged-far-radium.glitch.me',
});


(async () => {
  const config: AxiosRequestConfig = {
    headers: {
      'Accept': 'application/json',
    } as RawAxiosRequestHeaders,
  };

  try {
    const data = { "email": "imelflorianingerl@gmail.com", "password": "ABC"};
    const searchResponse: AxiosResponse = await client.post(`/api/login`, data, config);
    console.log( searchResponse.data);

    console.log("Here is the token:");
    console.log( searchResponse.data.token );
  } catch(err) {
    console.log(err);
  }  
})();