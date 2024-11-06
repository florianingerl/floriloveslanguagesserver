import axios, { AxiosResponse, AxiosRequestConfig, RawAxiosRequestHeaders } from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:8080',
});


(async () => {
  const config: AxiosRequestConfig = {
    headers: {
      'Accept': 'application/json',
      'x-auth-token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3MmFmNjVkZDIzMzBlNjlhN2M3MmZkZSIsImlhdCI6MTczMDg4MTEzMSwiZXhwIjoxNzMwODg0NzMxfQ.DWGqCYvqoh_LUw_AuUUh_KrUd2v_wRu0GnLm1Yo9csI'
    } as RawAxiosRequestHeaders,
  };

  try {
    const searchResponse: AxiosResponse = await client.get(`/api/auth/user`, config);
    console.log(searchResponse.status );
    console.log( searchResponse.data);
    console.log(searchResponse.data.message );

  } catch(err) {
    console.log(err);
  }  
})();