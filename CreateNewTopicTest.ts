import axios, { AxiosResponse, AxiosRequestConfig, RawAxiosRequestHeaders } from 'axios';
import { authConfig } from './src/helpers/authHeader';

const client = axios.create({
  baseURL: 'http://localhost:8080',
});


(async () => {
  const config: AxiosRequestConfig = {
    headers: {
      'Accept': 'application/json',
      ...(await authConfig()).headers,
    } as RawAxiosRequestHeaders,
  };

  try {
  
    const data = { "quiz": "french", "title": "Qui ou que", "tutorial": "Qui is the subject of the relative clause, whereas que is the direct object!" };
    const response: AxiosResponse = await client.post(`/api/topic`, data, config);
    console.log( response.data );
    console.log(response.status);
    console.log(response.data.json);    

    console.log(response.data.message );

  } catch(err) {
    console.log(err);
  }  
})();