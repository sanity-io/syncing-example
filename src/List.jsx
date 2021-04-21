import React, { useEffect, useState } from "react";
import { prod } from "./clients";
import { Link } from "react-router-dom"

const query = "* {_id, _type} | order(_createdAt desc)";

const List = () => {
  const [docs, setDocs] = React.useState([]);
  useEffect(() => {
    prod.fetch(query).then(setDocs);
    const subscription = prod.listen(query, {}, {visibility: "query"}).subscribe((update) => {
      prod.fetch(query).then(setDocs);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  return (
    <>
      <h1>Documents</h1>
      <small>{docs.length} documents</small>
      <ul>
        {docs.map((d) => (
          <li>
          <Link to={`/doc/${d._id}`}>
            ({d._type}) {d._id}
          </Link>
          </li>
        ))}
      </ul>
    </>
  );
};

export default List