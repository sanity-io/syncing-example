import React, { useEffect, useState } from "react"
import { useParams } from "react-router-dom";
import {prod, sync} from "./clients"

const query = "* [_id == $id]"

const Doc = () => {
  const {id} = useParams();
  const [docA, setDocA] = useState({})
  const [docB, setDocB] = useState({})

  useEffect(() => {
    prod.fetch(query, {id}).then(setDocA);
    sync.fetch(query, {id}).then(setDocB);
    const subscriptionA = prod.listen(query, {id}).subscribe((update) => {
      setDocA(update.result)
    });
    const subscriptionB = sync.listen(query, {id}).subscribe((update) => {
      setDocB(update.result)
    });
    return () => {
      subscriptionA.unsubscribe();
      subscriptionB.unsubscribe();
    };
  }, []);
  return (
    <>
    <h1>Dataset: {prod.config().dataset}</h1>
    <pre>{JSON.stringify(docA, null, 2)}</pre>
    <h1>Dataset: {sync.config().dataset}</h1>
    <pre>{JSON.stringify(docB, null, 2)}</pre>
    </>
  );
};

export default Doc