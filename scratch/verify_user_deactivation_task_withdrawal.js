const path = require("path");
const backendPath = path.join(__dirname, "../Backend");
module.paths.push(path.join(backendPath, "node_modules"));

const mongoose = require(path.join(backendPath, "node_modules/mongoose"));
require(path.join(backendPath, "node_modules/dotenv")).config({ path: path.join(backendPath, ".env") });

const User = require(path.join(backendPath, "models/User"));
const Task = require(path.join(backendPath, "models/Task"));
const Activity = require(path.join(backendPath, "models/Activity"));
const Notification = require(path.join(backendPath, "models/Notification"));
const { TASK_STATUS, ROLES } = require(path.join(backendPath, "constants/constants"));
const { toggleUserStatus, getUserActiveTasksCount } = require(path.join(backendPath, "services/user/userManagementService"));

async function runVerification() {
  console.log("=================================================");
  console.log("VERIFYING USER DEACTIVATION - MANDATORY TASK WITHDRAWAL");
  console.log("=================================================");

  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/company_task_manager";
  console.log(`Connecting to MongoDB...`);
  await mongoose.connect(mongoUri);

  try {
    // Setup dummy admin and test employees
    const adminUser = await User.findOne({ role: ROLES.ADMIN }) || await User.create({
      name: "Test Admin",
      email: "testadmin_deact@test.com",
      password: "hashedpassword",
      employeeId: "ADM999",
      role: ROLES.ADMIN,
      isActive: true,
    });

    const reqMock = (params = {}, body = {}) => ({
      params,
      body,
      user: { userId: adminUser._id.toString(), role: adminUser.role },
    });

    const resMock = () => {
      const res = {};
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (data) => {
        res.body = data;
        return res;
      };
      return res;
    };

    // -----------------------------------------------------------------
    // TEST 1: Deactivate employee with NO active tasks
    // -----------------------------------------------------------------
    console.log("\n[TEST 1] Deactivating employee with NO active assigned tasks...");
    const emp1 = await User.create({
      name: "Emp No Tasks",
      email: "emp_notasks@test.com",
      password: "hashedpassword",
      employeeId: "EMP_NT_01",
      role: ROLES.EMPLOYEE,
      isActive: true,
    });

    let res1 = resMock();
    await toggleUserStatus(reqMock({ id: emp1._id.toString() }), res1);

    const updatedEmp1 = await User.findById(emp1._id);
    if (updatedEmp1.isActive !== false) throw new Error("TEST 1 Failed: User status was not set to inactive!");
    if (res1.body.withdrawnTasksCount !== 0) throw new Error("TEST 1 Failed: Expected 0 withdrawn tasks!");
    console.log(`PASS: TEST 1 passed cleanly. Message: "${res1.body.message}"`);

    // Reactivate emp1 for clean state
    emp1.isActive = true;
    await emp1.save();

    // -----------------------------------------------------------------
    // TEST 2: Deactivate employee with 1 active task
    // -----------------------------------------------------------------
    console.log("\n[TEST 2] Deactivating employee with 1 active task...");
    const emp2 = await User.create({
      name: "Emp One Task",
      email: "emp_onetask@test.com",
      password: "hashedpassword",
      employeeId: "EMP_1T_01",
      role: ROLES.EMPLOYEE,
      isActive: true,
    });

    const task1 = await Task.create({
      title: "Test Active Task 1",
      description: "Desc",
      assignedTo: emp2._id,
      assignedBy: adminUser._id,
      createdBy: adminUser._id,
      dueDate: new Date(Date.now() + 86400000),
      status: TASK_STATUS.IN_PROGRESS,
    });

    let res2 = resMock();
    await toggleUserStatus(reqMock({ id: emp2._id.toString() }), res2);

    const updatedEmp2 = await User.findById(emp2._id);
    const updatedTask1 = await Task.findById(task1._id);

    if (updatedEmp2.isActive !== false) throw new Error("TEST 2 Failed: User was not deactivated!");
    if (updatedTask1.status !== TASK_STATUS.WITHDRAWN) throw new Error("TEST 2 Failed: Active task was not withdrawn!");
    if (res2.body.withdrawnTasksCount !== 1) throw new Error("TEST 2 Failed: Expected withdrawnTasksCount = 1");
    console.log(`PASS: TEST 2 passed. Message: "${res2.body.message}"`);

    // -----------------------------------------------------------------
    // TEST 3: Deactivate employee with multiple active tasks
    // -----------------------------------------------------------------
    console.log("\n[TEST 3] Deactivating employee with MULTIPLE active tasks...");
    const emp3 = await User.create({
      name: "Emp Multi Tasks",
      email: "emp_multitasks@test.com",
      password: "hashedpassword",
      employeeId: "EMP_MT_01",
      role: ROLES.EMPLOYEE,
      isActive: true,
    });

    const taskA = await Task.create({
      title: "Multi Task A",
      description: "Desc",
      assignedTo: emp3._id,
      assignedBy: adminUser._id,
      createdBy: adminUser._id,
      dueDate: new Date(Date.now() + 86400000),
      status: TASK_STATUS.ASSIGNED,
    });

    const taskB = await Task.create({
      title: "Multi Task B",
      description: "Desc",
      assignedTo: emp3._id,
      assignedBy: adminUser._id,
      createdBy: adminUser._id,
      dueDate: new Date(Date.now() + 86400000),
      status: TASK_STATUS.ACCEPTED,
    });

    const taskC = await Task.create({
      title: "Multi Task C",
      description: "Desc",
      assignedTo: emp3._id,
      assignedBy: adminUser._id,
      createdBy: adminUser._id,
      dueDate: new Date(Date.now() + 86400000),
      status: TASK_STATUS.SUBMITTED,
    });

    let res3 = resMock();
    await toggleUserStatus(reqMock({ id: emp3._id.toString() }), res3);

    const updatedEmp3 = await User.findById(emp3._id);
    const tasksEmp3 = await Task.find({ assignedTo: emp3._id });

    if (updatedEmp3.isActive !== false) throw new Error("TEST 3 Failed: User was not deactivated!");
    if (tasksEmp3.some((t) => t.status !== TASK_STATUS.WITHDRAWN)) {
      throw new Error("TEST 3 Failed: Not all active tasks were withdrawn!");
    }
    if (res3.body.withdrawnTasksCount !== 3) throw new Error("TEST 3 Failed: Expected withdrawnTasksCount = 3");
    console.log(`PASS: TEST 3 passed. Message: "${res3.body.message}"`);

    // -----------------------------------------------------------------
    // TEST 4: Mixed task statuses (Closed & Withdrawn must remain untouched)
    // -----------------------------------------------------------------
    console.log("\n[TEST 4] Verifying Mixed Task Statuses...");
    const emp4 = await User.create({
      name: "Emp Mixed Tasks",
      email: "emp_mixed@test.com",
      password: "hashedpassword",
      employeeId: "EMP_MX_01",
      role: ROLES.EMPLOYEE,
      isActive: true,
    });

    const activeTask = await Task.create({
      title: "Active Task",
      description: "Desc",
      assignedTo: emp4._id,
      assignedBy: adminUser._id,
      createdBy: adminUser._id,
      dueDate: new Date(Date.now() + 86400000),
      status: TASK_STATUS.IN_PROGRESS,
    });

    const closedTask = await Task.create({
      title: "Closed Task",
      description: "Desc",
      assignedTo: emp4._id,
      assignedBy: adminUser._id,
      createdBy: adminUser._id,
      dueDate: new Date(Date.now() + 86400000),
      status: TASK_STATUS.CLOSED,
    });

    let res4 = resMock();
    await toggleUserStatus(reqMock({ id: emp4._id.toString() }), res4);

    const updatedActiveTask = await Task.findById(activeTask._id);
    const updatedClosedTask = await Task.findById(closedTask._id);

    if (updatedActiveTask.status !== TASK_STATUS.WITHDRAWN) throw new Error("TEST 4 Failed: Active task was not withdrawn!");
    if (updatedClosedTask.status !== TASK_STATUS.CLOSED) throw new Error("TEST 4 Failed: Closed task was mutated!");
    console.log("PASS: TEST 4 passed. Only active tasks withdrawn; Closed task preserved.");

    // -----------------------------------------------------------------
    // TEST 5: Direct API & Active Tasks Count Endpoint
    // -----------------------------------------------------------------
    console.log("\n[TEST 5] Verifying Active Tasks Count Endpoint...");
    const resCount = resMock();
    await getUserActiveTasksCount(reqMock({ id: emp2._id.toString() }), resCount);
    if (resCount.body.count !== 0) throw new Error("TEST 5 Failed: Active tasks count should be 0 after deactivation!");
    console.log("PASS: Active tasks count API endpoint verified.");

    // -----------------------------------------------------------------
    // TEST 6: Reactivation (Withdrawn tasks remain Withdrawn)
    // -----------------------------------------------------------------
    console.log("\n[TEST 6] Reactivating Employee & Verifying Tasks Remain Withdrawn...");
    let resReactivate = resMock();
    await toggleUserStatus(reqMock({ id: emp2._id.toString() }), resReactivate);

    const reactivatedEmp2 = await User.findById(emp2._id);
    const reactivatedTask1 = await Task.findById(task1._id);

    if (reactivatedEmp2.isActive !== true) throw new Error("TEST 6 Failed: User was not reactivated!");
    if (reactivatedTask1.status !== TASK_STATUS.WITHDRAWN) {
      throw new Error("TEST 6 Failed: Reactivation restored withdrawn task!");
    }
    console.log("PASS: TEST 6 passed. Reactivation restored user status without restoring withdrawn tasks.");

    // -----------------------------------------------------------------
    // TEST 7: Activity Log Verification
    // -----------------------------------------------------------------
    console.log("\n[TEST 7] Verifying Activity Log Entries for Automatic Withdrawal...");
    const activity = await Activity.findOne({ task: task1._id });
    if (!activity) throw new Error("TEST 7 Failed: No activity record created for automatic withdrawal!");
    console.log(`PASS: Activity log entry verified: ${activity.action} - ${activity.details}`);

    // Cleanup test data
    await User.deleteMany({ email: { $in: [emp1.email, emp2.email, emp3.email, emp4.email] } });
    await Task.deleteMany({ _id: { $in: [task1._id, taskA._id, taskB._id, taskC._id, activeTask._id, closedTask._id] } });
    await Activity.deleteMany({ task: { $in: [task1._id, taskA._id, taskB._id, taskC._id, activeTask._id, closedTask._id] } });
    await Notification.deleteMany({ task: { $in: [task1._id, taskA._id, taskB._id, taskC._id, activeTask._id, closedTask._id] } });

    console.log("\n=================================================");
    console.log("ALL USER DEACTIVATION TASK WITHDRAWAL TESTS PASSED!");
    console.log("USER DEACTIVATION MANDATORY TASK WITHDRAWAL: PASS");
    console.log("=================================================");
  } finally {
    await mongoose.disconnect();
  }
}

runVerification();
