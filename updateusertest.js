try {
    db.users.findOneAndUpdate(
       { "email" : "flori@gmx.de" },
       { $set: { "email" : "florian@gmx.de" }},
    );
    }
    catch (e){
       print(e);
    }