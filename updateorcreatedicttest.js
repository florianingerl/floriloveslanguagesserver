let dictName = "Stupid dictionary";
let dictUrl = "http://www.stupiddict.de";

try {
    db.dicts.findOneAndUpdate(
       { "name" : dictName },
       { $set: { "url" : dictUrl }},
    );
    }
    catch (e){
       print(e);
    }