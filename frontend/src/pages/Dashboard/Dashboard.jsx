import "./Dashboard.css";

import { useState, useEffect } from "react";
import taskService from "../../services/taskService";
import Navbar from "../../components/Navbar/Navbar";
import SearchBar from "../../components/SearchBar/SearchBar";
import TaskCard from "../../components/TaskCard/TaskCard";
import EmptyState from "../../components/EmptyState/EmptyState";
import Loader from "../../components/Loader/Loader";
import TaskModal from "../../components/Modal/TaskModal";
import DeleteModal from "../../components/DeleteModal/DeleteModal";
import NoResults from "../../components/NoResults/NoResults";

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [taskList, setTaskList] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);

      const response = await taskService.getTasks();

      setTaskList(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = async (newTask) => {
    await taskService.createTask(newTask);
    await fetchTasks();
  };

  const handleUpdateTask = async (updatedTask) => {
    await taskService.updateTask(updatedTask._id, updatedTask);
    await fetchTasks();
  };

  const handleAddTask = () => {
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  const handleEditTask = (task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedTask(null);
    setIsModalOpen(false);
  };

  const handleDeleteClick = (task) => {
    setTaskToDelete(task);
    setDeleteModalOpen(true);
  };

  const filteredTasks = taskList.filter((task) => {
    const matchesSearch =
      task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterStatus === "All" || task.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  return (
    <>
      <Navbar />

      <div className="dashboard">
        <div className="dashboard-header">
          <div>
            <h1>Dashboard</h1>
            <p>Manage all your tasks in one place.</p>
          </div>

          <button className="add-btn" onClick={handleAddTask}>
            + Add Task
          </button>
        </div>

        <SearchBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
        />

        {loading ? (
          <Loader />
        ) : taskList.length === 0 ? (
          <EmptyState onCreate={handleAddTask} />
        ) : filteredTasks.length === 0 ? (
          <NoResults />
        ) : (
          <div className="task-grid">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onEdit={handleEditTask}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        )}

        <TaskModal
          isOpen={isModalOpen}
          onClose={closeModal}
          isEdit={selectedTask !== null}
          task={selectedTask}
          onUpdate={handleUpdateTask}
          onSave={handleCreateTask}
        />
        <DeleteModal
          isOpen={deleteModalOpen}
          task={taskToDelete}
          onClose={() => {
            setDeleteModalOpen(false);
            setTaskToDelete(null);
          }}
          onConfirm={async () => {
            try {
              await taskService.deleteTask(taskToDelete._id);

              await fetchTasks();

              setDeleteModalOpen(false);
              setTaskToDelete(null);
            } catch (error) {
              console.log(error.response?.data?.message || error.message);
            }
          }}
        />
      </div>
    </>
  );
}

export default Dashboard;
