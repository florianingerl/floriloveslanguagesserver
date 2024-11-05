import axios, { AxiosResponse, AxiosRequestConfig, RawAxiosRequestHeaders } from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:8080',
});

type emailOwner = {
 email: string
}


(async () => {
  const config: AxiosRequestConfig = {
    headers: {
      'Accept': 'application/json',
    } as RawAxiosRequestHeaders,
  };
  
  try {
    const searchResponse: AxiosResponse = await client.get(`/api/user`, config);
    console.log(searchResponse);
    const emailOwners: emailOwner[] = searchResponse.data;
    
    emailOwners.forEach ( (owner: emailOwner) => {
        console.log( owner.email );
        if( owner.email == "imelflorianingerl@gmail.com") {
            console.log("A user with the email imelflorianingerl@gmail.com already exists!");
        }
    });

   
  } catch(err) {
    console.log(err);
  }  
})();