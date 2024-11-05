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
    const data = { "name": "Viktor","email": "viktor@gmail.com","password": "ABC"};
    const response: AxiosResponse = await client.post(`/api/user`, data , config);
    console.log(response.status);
    console.log(response.data.json);    
  } catch(err) {
    console.log(err);
  }  
})();