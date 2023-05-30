import React, {useEffect, useState} from 'react';
import axios from 'axios';
import {Route, useHistory} from 'react-router-dom';
import {AddList, List, Tasks} from './components';
import PieChart from "./components/Pie/PieChart"
import Chart from "chart.js/auto";
import {CategoryScale} from "chart.js";

Chart.register(CategoryScale);

function App() {
  const [lists, setLists] = useState([]);
  const [colors, setColors] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeItem, setActiveItem] = useState([]);

  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [showIncompleteTasks, setShowIncompleteTasks] = useState(false);
  const [showOverdueTasks, setShowOverdueTasks] = useState(false);

  let history = useHistory();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const response = await axios.get('http://localhost:3001/lists?_expand=color&_embed=tasks')
    setLists(response.data);

    const colorsResponse = await axios.get('http://localhost:3001/colors')
    setColors(colorsResponse.data);

    const tasksResponse = await axios.get('http://localhost:3001/tasks')
    setTasks(tasksResponse.data);
  }

  const handleShowCompletedTasksChange = () => {
    setShowCompletedTasks(!showCompletedTasks);
  };

  const handleShowIncompleteTasksChange = () => {
    setShowIncompleteTasks(!showIncompleteTasks);
  };

  const handleShowOverdueTasksChange = () => {
    setShowOverdueTasks(!showOverdueTasks);
  };

  const filteredTasks = tasks.filter(task => {
    if (showCompletedTasks && showIncompleteTasks) {
      return true; // Показываем все задачи
    } else if (showCompletedTasks) {
      const listOfLists = lists.find(list => list.id === task.listId);
      return listOfLists && task.completed; // Проверяем свойство tasks у соответствующего списка
    } else if (showIncompleteTasks) {
      const listOfLists = lists.find(list => list.id === task.listId);
      return listOfLists && !task.completed; // Проверяем свойство tasks у соответствующего списка
    }
    return false;
  });

  const findOverdueTasks = tasks.filter(task => {
    if (showOverdueTasks) {
      return new Date(task.dateOverdue) < new Date() && !task.completed;
    }

    return false;
  });

  const onAddList = obj => {
    const newList = [...lists, obj];
    setLists(newList);
  };

  const onAddTask = (listId, taskObj) => {
    const newList = lists.map(item => {
      if (item.id === listId) {
        item.tasks = [...item.tasks, taskObj];
      }
      return item;
    });
    setLists(newList);
  };

  const onEditTask = (listId, taskObj) => {
    const newTaskText = window.prompt('Текст задачи', taskObj.text);

    if (!newTaskText) {
      return;
    }

    const newList = lists.map(list => {
      if (list.id === listId) {
        list.tasks = list.tasks.map(task => {
          if (task.id === taskObj.id) {
            task.text = newTaskText;
          }
          return task;
        });
      }
      return list;
    });
    setLists(newList);
    axios
      .patch('http://localhost:3001/tasks/' + taskObj.id, {
        text: newTaskText
      })
      .catch(() => {
        alert('Не удалось обновить задачу');
      });
  };

  const onRemoveTask = (listId, taskId) => {
    if (window.confirm('Вы действительно хотите удалить задачу?')) {
      const newList = lists.map(item => {
        if (item.id === listId) {
          item.tasks = item.tasks.filter(task => task.id !== taskId);
        }
        return item;
      });
      setLists(newList);
      axios.delete('http://localhost:3001/tasks/' + taskId).catch(() => {
        alert('Не удалось удалить задачу');
      });
    }
  };

  const onCompleteTask = (listId, taskId, completed) => {
    const newList = lists.map(list => {
      if (list.id === listId) {
        list.tasks = list.tasks.map(task => {
          if (task.id === taskId) {
            task.completed = completed;
          }
          return task;
        });
      }
      return list;
    });
    setLists(newList);
    axios
      .patch('http://localhost:3001/tasks/' + taskId, {
        completed
      })
      .catch(() => {
        alert('Не удалось обновить задачу');
      });
  };

  const onEditListTitle = (id, title) => {
    const newList = lists.map(item => {
      if (item.id === id) {
        item.name = title;
      }
      return item;
    });
    setLists(newList);
  };

  const completedTasksCount  = {};
  tasks.forEach(task => {
    if (task.completed) {
      if (completedTasksCount[task.listId]) {
        completedTasksCount[task.listId]++;
      } else {
        completedTasksCount[task.listId] = 1;
      }
    }
  });

  const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  const chartData = {
    labels: lists.map(list => list.name),
    datasets: [
      {
        label: "Выполнено задач ",
        data: lists.map(list => completedTasksCount[list.id]),
        backgroundColor: tasks.map(() => getRandomColor()),
        borderColor: "black",
        borderWidth: 2
      }
    ]
  };

  useEffect(() => {
    const listId = history.location.pathname.split('lists/')[1];
    if (lists) {
      const list = lists.find(list => list.id === Number(listId));
      setActiveItem(list);
    }
  }, [lists, history.location.pathname]);

  return (
    <div className="todo">
      <div>
        <h2>Выполненные/не выполненные</h2>
        {filteredTasks.map(task => (
            <div key={task.id}>
              <p>{task.text}</p>
            </div>
        ))}
      </div>
      <div>
        <h2>Список просроченных задач</h2>
        {findOverdueTasks.map(task => (
            <div key={task.id}>
              <p>{task.text}</p>
            </div>
        ))}
      </div>
      <div className="todo__sidebar">
        <List
          onClickItem={list => {
            history.push(`/`);
          }}
          items={[
            {
              active: history.location.pathname === '/',
              icon: (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12.96 8.10001H7.74001C7.24321 8.10001 7.20001 8.50231 7.20001 9.00001C7.20001 9.49771 7.24321 9.90001 7.74001 9.90001H12.96C13.4568 9.90001 13.5 9.49771 13.5 9.00001C13.5 8.50231 13.4568 8.10001 12.96 8.10001V8.10001ZM14.76 12.6H7.74001C7.24321 12.6 7.20001 13.0023 7.20001 13.5C7.20001 13.9977 7.24321 14.4 7.74001 14.4H14.76C15.2568 14.4 15.3 13.9977 15.3 13.5C15.3 13.0023 15.2568 12.6 14.76 12.6ZM7.74001 5.40001H14.76C15.2568 5.40001 15.3 4.99771 15.3 4.50001C15.3 4.00231 15.2568 3.60001 14.76 3.60001H7.74001C7.24321 3.60001 7.20001 4.00231 7.20001 4.50001C7.20001 4.99771 7.24321 5.40001 7.74001 5.40001ZM4.86001 8.10001H3.24001C2.74321 8.10001 2.70001 8.50231 2.70001 9.00001C2.70001 9.49771 2.74321 9.90001 3.24001 9.90001H4.86001C5.35681 9.90001 5.40001 9.49771 5.40001 9.00001C5.40001 8.50231 5.35681 8.10001 4.86001 8.10001ZM4.86001 12.6H3.24001C2.74321 12.6 2.70001 13.0023 2.70001 13.5C2.70001 13.9977 2.74321 14.4 3.24001 14.4H4.86001C5.35681 14.4 5.40001 13.9977 5.40001 13.5C5.40001 13.0023 5.35681 12.6 4.86001 12.6ZM4.86001 3.60001H3.24001C2.74321 3.60001 2.70001 4.00231 2.70001 4.50001C2.70001 4.99771 2.74321 5.40001 3.24001 5.40001H4.86001C5.35681 5.40001 5.40001 4.99771 5.40001 4.50001C5.40001 4.00231 5.35681 3.60001 4.86001 3.60001Z"
                    fill="black"
                  />
                </svg>
              ),
              name: 'Все задачи'
            }
          ]}
        />
        {lists ? (
          <List
            items={lists}

            onRemove={id => {
              const newLists = lists.filter(item => item.id !== id);
              setLists(newLists);
            }}
            onClickItem={list => {
              history.push(`/lists/${list.id}`);
            }}
            activeItem={activeItem}
            isRemovable
          />
        ) : (
          'Загрузка...'
        )}
        <AddList onAdd={onAddList} colors={colors} />
      </div>
      <div className="todo__tasks">
        <label>
          <input
              type="checkbox"
              checked={showCompletedTasks}
              onChange={handleShowCompletedTasksChange}
          />
          Показать выполненные задачи
        </label>
        <br />
        <label>
          <input
              type="checkbox"
              checked={showIncompleteTasks}
              onChange={handleShowIncompleteTasksChange}
          />
          Показать невыполненные задачи
        </label>
        <br />
        <label>
          <input
              type="checkbox"
              checked={showOverdueTasks}
              onChange={handleShowOverdueTasksChange}
          />
          Показать просроченные задачи
        </label>
        <br />
        <div className="App" style={{width: 400}}>
          <PieChart chartData={chartData}/>
        </div>
        <Route exact path="/">
          {lists &&
          lists.map(list => (
              <Tasks
                key={list.id}
                list={list}
                onAddTask={onAddTask}
                onEditTitle={onEditListTitle}
                onRemoveTask={onRemoveTask}
                onEditTask={onEditTask}
                onCompleteTask={onCompleteTask}
                withoutEmpty
              />
            ))}
        </Route>
        <Route path="/lists/:id">
          {lists && activeItem && (
            <Tasks
              list={activeItem}
              onAddTask={onAddTask}
              onEditTitle={onEditListTitle}
              onRemoveTask={onRemoveTask}
              onEditTask={onEditTask}
              onCompleteTask={onCompleteTask}
            />
          )}
        </Route>
      </div>
    </div>
  );
}

export default App;
