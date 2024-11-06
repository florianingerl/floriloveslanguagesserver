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
    const data = {'name': 'Gustav Ingerl', "email": "gustav@gmail.com", "password": "ABC"};
    const response: AxiosResponse = await client.post(`/api/register`, data , config);
    console.log(response.status);
    console.log(response.data);   
    
    console.log("Here comes the token!");
    console.log(response.data.token);
  } catch(err) {
    console.log(err);
  }  
})();