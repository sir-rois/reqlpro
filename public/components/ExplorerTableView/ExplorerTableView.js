const React = require('react');
const {Table, Column, Cell} = require('fixed-data-table');
import JSONTree from 'react-json-tree';

var ExplorerTableView = React.createClass({
  getInitialState: function() {
    return this.props;
  },
  componentDidMount: function() {

  },
  componentWillReceiveProps: function(nextProps) {
    this.setState(nextProps);
  },
  composeCellBody: function(data) {
    if(typeof data !== 'object') {
      return data;
    } else {
      if(data) {
        if(Object.keys(data).length) {
          return <JSONTree data={data} />;
        } else {
          return JSON.stringify(data);
        }
      } else {
        return JSON.stringify(data);
      }
    }
  },
  render: function() {
    var maximumProps = 0, // Keep track of what has had the most props so far
        rowIndexOfMaximum = 0; // The item in the data with the most props
    this.state.data.map(function(row, index) {
      maximumProps = Object.keys(row).length > maximumProps ? Object.keys(row).length : maximumProps;
      rowIndexOfMaximum = Object.keys(row).length > maximumProps ? index : rowIndexOfMaximum;
    });
    var _this = this;
    var columnNodes = Object.keys(this.state.data[rowIndexOfMaximum]).map(function(value, index) {
      return (
        <Column
          key={index}
          header={<Cell>{value}</Cell>}
          cell={props => (
            <Cell>
              {_this.composeCellBody(_this.state.data[props.rowIndex][value])}
            </Cell>
          )}
          width={200} />
      );
    });
    return (
      <Table
        rowsCount={this.state.data.length}
        rowHeight={50}
        headerHeight={30}
        width={document.getElementById('explorer-body').offsetWidth}
        height={window.innerHeight - 100}>
        {columnNodes}
      </Table>
    );
  }
});

module.exports = ExplorerTableView;