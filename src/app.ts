// Interface for dragging and dropping
interface Draggable {
  dragStartHandler(event: DragEvent): void;
  dragEndHandler(event: DragEvent): void;
}

interface DragTarget {
  // permit drop
  dragOverHandler(event: DragEvent): void;
  // handle drop
  dropHandler(event: DragEvent): void;
  // handle css while dragging
  dragLeaveHandler(event: DragEvent): void;
}

// Add autobind decorator for method
function Autobind(
  _target: any,
  _methodNAme: string,
  descriptor: PropertyDescriptor
) {
  // get the recent descriptor/function
  const currentDescriptor = descriptor.value;

  // create a newDescriptor
  const newDescriptor: PropertyDescriptor = {
    // new descriptor will be configurable
    configurable: true,
    // The get function for the new descriptor. i.e. when the function is called should return the following
    get() {
      // new methods will be same as old one but will bind 'this'(global object: since decorators get the global object to the class it is used in)
      const boundFn = currentDescriptor.bind(this);
      console.log(`This is 'this' object from Autobind::::`, this);
      // returned the newly bounded method 'boundFn' in 'newDescriptor'
      return boundFn;
    },
  };

  // return the newDescriptor to the method on which it was called
  return newDescriptor;
}

// Empty Property decorator
function isNotEmpty(target: any, propertyName: string) {
  const propertyDescriptor = Reflect.getOwnPropertyDescriptor(
    target,
    propertyName
  );

  if (propertyDescriptor) {
    console.log("Got here");
    const originalSetter = propertyDescriptor.set;
    propertyDescriptor.set = function (notEmptyProperty: string) {
      if (!notEmptyProperty) {
        alert(propertyName + " cannot be empty!!");
      }
      originalSetter?.call(this, notEmptyProperty);
    };
    Reflect.defineProperty(target, propertyName, propertyDescriptor);
  }
}

// Custom type to have 'listeners' function
type listeners<T> = (items: T[]) => void;

// Enum for ProjectStatus
enum ProjectStatus {
  Active,
  Finished,
}

// Project type
// Class to have type of Project defined
class Project {
  constructor(
    public id: string,
    public title: string,
    public description: string,
    public people: number,
    public projectStatus: ProjectStatus
  ) {}
}

// Class state
class State<T> {
  // Aray of listners function that take type 'T'
  protected listeners: listeners<T>[];

  // New listners array initialized
  constructor() {
    this.listeners = [];
  }

  // Function to append list of listners
  addListeners(listnerFunc: listeners<T>) {
    this.listeners.push(listnerFunc);
  }
}

// Project-data class
// This is a singleton class
// State of type-Projects is passed. So array of listners function Receives object of type 'Project'
class ProjectState extends State<Project> {
  private projects: Project[] = [];
  // variable to store the instance of this class
  private static instance: ProjectState;

  private constructor() {
    super();
  }

  // static method to check only one instacne is created for this class
  static getInstance() {
    if (this.instance) {
      return this.instance;
    }
    this.instance = new ProjectState();
    return this.instance;
  }

  // function to receive ProjectData for updation
  projectData(title: string, description: string, people: number) {
    // const newData = {
    //   id: Math.random().toString(),
    //   title: title,
    //   description: description,
    //   people: people,
    // };
    const newProject = new Project(
      Math.random().toString(),
      title,
      description,
      people,
      //Initially keep status of project as 'active'
      ProjectStatus.Active
    );

    // Push the received data to 'projects'
    this.projects.push(newProject);
    this.updateListners();
  }

  moveProject(projectId: string, newStatus: ProjectStatus) {
    const project = this.projects.find((prj) => prj.id === projectId);
    if (project ) {
      project.projectStatus = newStatus;
      this.updateListners();
    }
  }

  private updateListners() {
    for (const listnerFunc of this.listeners) {
      // return updated projects to all functions in the listners array
      // Array is sliced so that a copy of array is passed and not the actual value
      listnerFunc(this.projects.slice());
    }
  }
}

const projectState = ProjectState.getInstance();

// abstract, generic class
// The two generic types are of the host element and the element to be mounted respectively
abstract class Component<T extends HTMLElement, U extends HTMLElement> {
  // template element which holds the code to be mounted in the host
  templateElement: HTMLTemplateElement;
  // Used to mount the elements inside itself
  hostElement: T;
  // element that is mounted inside the host element
  element: U;

  // constructor takes in,
  // templateId: id of template used to extract code from inside
  // hostElementId: id of the host element to embed the guest element inside it
  // insertAtStart: tell if we want the guest element at start
  // newElementId: id of the guest element inside the template
  constructor(
    templateId: string,
    hostElementId: string,
    insertAtStart: boolean,
    newElementId?: string
  ) {
    this.templateElement = document.getElementById(
      templateId
    )! as HTMLTemplateElement;
    this.hostElement = document.getElementById(hostElementId)! as T;

    // Make a deep copy of code inside the template
    const importedNode = document.importNode(
      this.templateElement.content,
      true
    );

    // Get the guest element from inside the template
    this.element = importedNode.firstElementChild as U;
    if (newElementId) {
      this.element.id = newElementId;
    }

    // depending upon 'insertAtStart', attach the guest element at the start or end of host element
    this.attach(insertAtStart);
  }

  // depending upon 'insertAtStart', attach the guest element at the start or end of host element
  private attach(insertAtBeginning: boolean) {
    this.hostElement.insertAdjacentElement(
      insertAtBeginning ? "afterbegin" : "beforeend",
      this.element
    );
  }

  // created abstract methods to have base class implement them
  abstract configure(): void;
  abstract renderContent(): void;
}

// ProjectItem Class

class ProjectItem
  extends Component<HTMLUListElement, HTMLLIElement>
  implements Draggable
{
  private project: Project;

  get persons() {
    if (this.project.people <= 1) {
      return `${this.project.people} person assigned`;
    } else {
      return `${this.project.people} people assigned`;
    }
  }

  constructor(hostId: string, project: Project) {
    super("single-project", hostId, false, project.id);
    this.project = project;

    this.configure();
    this.renderContent();
  }

  @Autobind
  dragStartHandler(event: DragEvent): void {
    event.dataTransfer!.setData("text/plain", this.project.id);
    event.dataTransfer!.effectAllowed = "move";
  }

  @Autobind
  dragEndHandler(event: DragEvent): void {}

  configure(): void {
    this.element.addEventListener("dragstart", this.dragStartHandler);
    this.element.addEventListener("dragend", this.dragEndHandler);
  }

  renderContent(): void {
    console.log("This is projectItem element", this.element);
    this.element.querySelector("h2")!.textContent = this.project.title;
    this.element.querySelector("h3")!.textContent = this.persons;
    this.element.querySelector("p")!.textContent = this.project.description;
  }
}

// Project-list class
// This class is used to render elements for both 'Active' and 'Finished' Project list depending on the arument passed during initialisation

// Extends 'Component' class to enable mounting of template element onto the host elemet
class ProjectList
  extends Component<HTMLDivElement, HTMLElement>
  implements DragTarget
{
  // Global list of assigned projects
  assignedProjects: Project[];

  // While initialising understand from the user of the instance will be used for 'active' or 'finished' project list
  // This could've taken as a new type. But the arguments are further to name the component
  constructor(private type: "active" | "finished") {
    // Call the component function to take the template named 'project-list' and mount that on host element named 'app'
    // ${type}-projects = id of the mounted component. It can be 'active-projects' or 'finished-projects'
    super("project-list", "app", false, `${type}-projects`);

    // just initialize to avoid errors of not initializing global variables
    this.assignedProjects = [];

    this.configure();
    this.renderContent();
  }

  @Autobind
  dragOverHandler(event: DragEvent): void {
    // checks if there is data attached and if the data attached is 'text/plain'
    if (event.dataTransfer && event.dataTransfer.types[0] === "text/plain") {
      event.preventDefault();
      const listEl = this.element.querySelector("ul")!;
      listEl.classList.add("droppable");
    }
  }

  @Autobind
  dragLeaveHandler(event: DragEvent): void {
    const listEl = this.element.querySelector("ul")!;
    listEl.classList.remove("droppable");
  }

  @Autobind
  dropHandler(event: DragEvent): void {
    const droppedId = event.dataTransfer!.getData("text/plain");
    projectState.moveProject(
      droppedId,
      this.type === "active" ? ProjectStatus.Active : ProjectStatus.Finished
    );
  }

  configure(): void {
    this.element.addEventListener("dragover", this.dragOverHandler);
    this.element.addEventListener("dragleave", this.dragLeaveHandler);
    this.element.addEventListener("drop", this.dropHandler);

    // add listners function. This takes 'Project[]' as input and is called from inside the 'ProjectState' class
    // 'addListners' add the below function as a listner.

    // This is a subscriber. It gets updated 'projects' whenever data is updated
    projectState.addListeners((projects: Project[]) => {
      // From the received list of projects, sort only relavent projects
      // Sorting means, depending on class('active' or 'finished') store only relavent data of finished and active projects
      const relaventProjects = projects.filter((proj) => {
        if (this.type === "active")
          return proj.projectStatus == ProjectStatus.Active;
        else return proj.projectStatus == ProjectStatus.Finished;
      });

      // now depending on class, it will have only 'active' or 'finished' projects
      this.assignedProjects = relaventProjects;

      // render projects based on relaventProjects
      this.renderProjects();
    });
  }

  // render the 'ul' of 'active' and 'finished' project with unique IDs
  renderContent() {
    const listId = `${this.type}-projects-list`;

    // set unique id depending on 'active-projects-list' or 'finished-projects-list'
    this.element.querySelector("ul")!.id = listId;

    // Set the H2 inside of this.element as 'ACTIVE PROJECTS' or 'FINISHED PROJECTS'
    this.element.querySelector(
      "h2"
    )!.textContent = `${this.type.toUpperCase()} PROJECTS`;
  }

  private renderProjects() {
    const unorderedList = document.getElementById(
      `${this.type}-projects-list`
    )! as HTMLUListElement;

    // Before setting new unordered list, empty previous values.
    // This ensures duplication
    unorderedList.innerHTML = "";
    for (const projectItem of this.assignedProjects) {
      // const liItem = document.createElement("li");
      // liItem.id = `li`

      new ProjectItem(this.element.querySelector("ul")!.id, projectItem);

      // Alternate way::::

      // // Create a array of element to append insdide <li>
      // const titleEl = document.createElement('h2');
      // const peopleEl = document.createElement("H3");
      // const descriptionEl = document.createElement("p");
      // titleEl.textContent = projectItem.title;
      // peopleEl.textContent = projectItem.people.toString();
      // descriptionEl.textContent = projectItem.description;

      // const elementToInsert = [
      //   titleEl, peopleEl, descriptionEl
      // ]

      // // append above created element(title, people and description) inside <li>
      // liItem.append(...elementToInsert);

      // insert all <li> inside <ul>
      // unorderedList.appendChild(liItem);
    }
  }
}

// Input Class
// This class is used to add the form from template and validate and get input from the user

class ProjectInput extends Component<HTMLDivElement, HTMLFormElement> {
  titleInputElement: HTMLInputElement;
  descriptionInputElement: HTMLInputElement;
  peopleInputElement: HTMLInputElement;

  // Unused params
  // @isNotEmpty
  // title!: string;
  // description!: string;
  // people!: number;

  constructor() {
    // call component class to embed 'project-inpout' element onto host element 'app'
    // Give the embeded element inside the host element a name as 'user-input'
    // true = in the host element, insert out element 'user-input' at the start
    super("project-input", "app", true, "user-input");

    // From the form element get the default values and print
    this.titleInputElement = this.element.querySelector(
      "#title"
    ) as HTMLInputElement;
    this.descriptionInputElement = this.element.querySelector(
      "#description"
    ) as HTMLInputElement;
    this.peopleInputElement = this.element.querySelector(
      "#people"
    ) as HTMLInputElement;
    console.log(`This is title:::: ${this.titleInputElement.value} \n\n 
        This is description:::: ${this.descriptionInputElement.value} \n\n
        This is people:::: ${this.peopleInputElement.value} \n\n`);

    this.configure();
  }

  // abstract functions from parent class 'Component'
  configure() {
    this.element.addEventListener("submit", this.handleSubmit);
  }

  // abstract functions from parent class 'Component'
  renderContent(): void {}

  // Autobind is a property decortor
  // It is used to modify the 'handleSubmit' function such that,
  // the default 'this' should point to the global instance of this class(ProjectInput)
  // and not the 'configure' method that called it.

  // To bind the scope of called and callee function same
  @Autobind
  private handleSubmit(event: Event) {
    event.preventDefault();

    // another function to access elements and get inputs after performing validations
    const input = this.getInput();

    // check if non-empty tupple is passed
    if (Array.isArray(input)) {
      console.log("This is input:::", input);
      const [title, description, people] = input;

      // call the static 'projectData' function of class 'ProjectState'
      // Note: class 'ProjectState' is a singleton class. i.e. it has only one instance - 'projectState'
      // when we get new input 'projectData' method is called and new data is passed
      projectState.projectData(title, description, people);

      // empty the inputfields
      this.resetInput();
    }
  }

  // Validate input and check if non of the fields are empty
  private getInput():
    | [title: string, description: string, people: number]
    | null {
    let title: string = this.titleInputElement.value;
    let description: string = this.descriptionInputElement.value;
    let people: string = this.peopleInputElement.value;

    if (
      title.trim().length == 0 ||
      description.trim().length == 0 ||
      people.trim().length == 0
    ) {
      // alert even if a single field is empty
      alert("All fields must be entered!");

      // null is preferred over void since the handler function can easily check returned values
      return null;
    } else {
      return [title, description, +people];
    }
  }

  // Reset the input field
  private resetInput() {
    console.log("Entered resetInput");
    this.element.reset();
  }
}

const prj = new ProjectInput();

const activeProjectList = new ProjectList("active");
const finishedProjectList = new ProjectList("finished");
