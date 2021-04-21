import React, { useEffect, useState } from "react";
import Doc from "./Doc"
import List from "./List"
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom";

const App = () => {
  return (
    <Router>
      <Switch>
        <Route exact path="/">
          <List />
        </Route>
        <Route path="/doc/:id">
          <Doc />
        </Route>
      </Switch>
    </Router>
  );
};

export default App;
