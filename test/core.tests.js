import jdenticon from 'jdenticon';
import md5 from 'md5';

import {
  setConnections,
  setEmail,
  addConnection,
  showConnectionForm,
  hideConnectionForm
} from '../public/core';

describe('Aplication Logic', () => {

  describe('setConnections', () => {
    it('adds saved connections to the state', () => {
      const state = Map();
      const connections = ['connection1', 'connection2'];
      let nextState = setConnections(state, connections);
      expect(nextState).to.equal(Map({
        connections: List.of('connection1', 'connection2')
      }));
    });
  });

  describe('setEmail', () => {
    it('adds email to redux store', () => {
      const state = {};
      const email = 'cassie@codehangar.io';
      let nextState = setEmail(state, email);
      expect(nextState).to.deep.equal({
        email: 'cassie@codehangar.io'
      });
    });
  });

  describe('showConnectionForm', () => {
    it('shows the add connection form if mode is NEW', () =>{
      const state = {
        email: 'cassie@codehangar.io'
      }
      const mode = 'NEW';
      const nextState = showConnectionForm(state, mode);
      expect(nextState).to.deep.equal({
        email: 'cassie@codehangar.io',
        showAddConnectionForm: true
      })
    })
    it('shows the edit connection form if mode is EDIT', () =>{
      
    })
  });

  describe('hideConnectionForm', () => {
    it('removes showAddConnectionForm and/or showEditConnectionForm from Redux store', () => {
      const state = {
        email: 'cassie@codehangar.io',
        showAddConnectionForm: true
      }
      const nextState = hideConnectionForm(state);
      expect(nextState).to.deep.equal({email: 'cassie@codehangar.io'});
      const state2 = {
        email: 'cassie@codehangar.io',
        showEditConnectionForm: true
      }
      const nextState2 = hideConnectionForm(state2);
      expect(nextState2).to.deep.equal({email: 'cassie@codehangar.io'});
    });
  });  describe('addConnection', () => {
    it('adds a new connection to the redux store', () =>{
      const state = {
        email: 'cassie@codehangar.io'
      }
      const connection = {
        authKey: "",
        database: "",
        host: "192.168.99.100",
        identicon: jdenticon.toSvg(md5("rethink-tut"), 40),
        index: 0,
        name: "rethink-tut",
        port: "32769"
      }
      const nextState = addConnection(state, connection);
      expect(nextState).to.deep.equal({
        email: 'cassie@codehangar.io',
        connections:[{
          authKey: "",
          database: "",
          host: "192.168.99.100",
          identicon: jdenticon.toSvg(md5("rethink-tut"), 40),
          index: 0,
          name: "rethink-tut",
          port: "32769"
        }]
      })
    });
  })

  describe('getConnection', () => {
    it('returns connection info from RethinkDB', () => {
      const connection = {
          authKey: "",
          database: "",
          host: "192.168.99.100",
          identicon: jdenticon.toSvg(md5("rethink-tut"), 40),
          index: 0,
          name: "rethink-tut",
          port: "32769"
      }
      const nextState = getConnection(state, connection)

    })
  })

})