import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Task, TaskListTypeEnum } from '@gauzy/models';
import { map, tap } from 'rxjs/operators';
import { TasksService } from './tasks.service';

@Injectable({
	providedIn: 'root'
})
export class TasksStoreService {
	private _tasks$: BehaviorSubject<Task[]> = new BehaviorSubject([]);
	public tasks$: Observable<Task[]> = this._tasks$
		.asObservable()
		.pipe(map(this._mapToViewModel));

	private _selectedTask$: BehaviorSubject<Task> = new BehaviorSubject(null);
	public selectedTask$: Observable<Task> = this._selectedTask$.asObservable();

	get tasks(): Task[] {
		return this._tasks$.getValue();
	}

	constructor(private _taskService: TasksService) {
		if (!this.tasks.length) {
			this.fetchTasks();
		}
	}

	fetchTasks() {
		this._taskService
			.getAllTasks()
			.pipe(tap(({ items }) => this.loadAllTasks(items)))
			.subscribe();
	}

	private _mapToViewModel(tasks) {
		return tasks.map((task) => ({
			...task,
			projectName: task.project ? task.project.name : undefined,
			employees: task.members ? task.members : undefined,
			creator: task.creator
				? `${task.creator.firstName} ${task.creator.lastName}`
				: null
		}));
	}

	loadAllTasks(tasks: Task[]): void {
		this._tasks$.next(tasks);
	}

	updateTasksViewMode(
		projectId: string,
		viewModeType: TaskListTypeEnum
	): void {
		this._tasks$.next([
			...this.tasks.map((task: Task) => {
				if (
					task.projectId === projectId &&
					task.project.taskListType !== viewModeType
				) {
					return {
						...task,
						project: { ...task.project, taskListType: viewModeType }
					};
				}
				return task;
			})
		]);
	}

	createTask(task: Task): void {
		console.log('createdTask[0] in store service: ', task);
		this._taskService
			.createTask(task)
			.pipe(
				tap((createdTask) => {
					console.log(
						'createdTask[1] in store service: ',
						createdTask
					);
					const tasks = [...this.tasks, createdTask];
					this._tasks$.next(tasks);
				})
			)
			.subscribe();
	}

	editTask(task: Task): void {
		this._taskService
			.editTask(task)
			.pipe(
				tap(() => {
					const tasks = [...this.tasks];
					const newState = tasks.map((t) =>
						t.id === task.id ? { ...t, ...task } : t
					);
					this._tasks$.next(newState);
				})
			)
			.subscribe();
	}

	delete(id: string): void {
		this._taskService
			.deleteTask(id)
			.pipe(
				tap(() => {
					const tasks = [...this.tasks];
					const newState = tasks.filter((t) => t.id !== id);
					this._tasks$.next(newState);
				})
			)
			.subscribe();
	}

	selectTask(task: Task) {
		this._selectedTask$.next(task);
	}
}
