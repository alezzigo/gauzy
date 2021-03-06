import { Component, OnInit } from '@angular/core';
import {
	EmployeeLevelInput,
	Tag,
	ComponentLayoutStyleEnum
} from '@gauzy/models';
import { NbToastrService, NbDialogService } from '@nebular/theme';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { ComponentEnum } from '../../@core/constants/layout.constants';
import { takeUntil, first } from 'rxjs/operators';
import { TranslationBaseComponent } from 'apps/gauzy/src/app/@shared/language-base/translation-base.component';
import { EmployeeLevelService } from 'apps/gauzy/src/app/@core/services/employee-level.service';
import { Store } from '../../@core/services/store.service';
import { LocalDataSource } from 'ng2-smart-table';
import { NotesWithTagsComponent } from '../../@shared/table-components/notes-with-tags/notes-with-tags.component';
import { DeleteConfirmationComponent } from '../../@shared/user/forms/delete-confirmation/delete-confirmation.component';

@Component({
	selector: 'ga-employee-level',
	templateUrl: './employee-level.component.html'
})
export class EmployeeLevelComponent extends TranslationBaseComponent
	implements OnInit {
	private _ngDestroy$ = new Subject<void>();

	organizationId: string;

	showAddCard: boolean;
	showEditDiv: boolean;

	employeeLevels: EmployeeLevelInput[] = [];
	selectedEmployeeLevel: EmployeeLevelInput;
	tags: Tag[] = [];
	isGridEdit: boolean;
	viewComponentName: ComponentEnum;
	dataLayoutStyle = ComponentLayoutStyleEnum.TABLE;
	settingsSmartTable: object;
	smartTableSource = new LocalDataSource();

	constructor(
		private readonly employeeLevelService: EmployeeLevelService,
		private dialogService: NbDialogService,
		private readonly toastrService: NbToastrService,
		private readonly store: Store,
		readonly translateService: TranslateService
	) {
		super(translateService);
		this.setView();
	}

	ngOnInit(): void {
		this.store.selectedOrganization$
			.pipe(takeUntil(this._ngDestroy$))
			.subscribe((organization) => {
				if (organization) {
					this.organizationId = organization.id;
					this.loadEmployeeLevels();
					this.loadSmartTable();
					this._applyTranslationOnSmartTable();
				}
			});
	}

	private async loadEmployeeLevels() {
		const { items } = await this.employeeLevelService.getAll(
			this.organizationId,
			['tags']
		);

		if (items) {
			this.employeeLevels = items;
			this.smartTableSource.load(items);
		}
	}
	setView() {
		this.viewComponentName = ComponentEnum.EMPLOYEE_LEVELS;
		this.store
			.componentLayout$(this.viewComponentName)
			.pipe(takeUntil(this._ngDestroy$))
			.subscribe((componentLayout) => {
				this.dataLayoutStyle = componentLayout;
				this.selectedEmployeeLevel =
					this.dataLayoutStyle === 'CARDS_GRID'
						? null
						: this.selectedEmployeeLevel;
			});
	}
	async loadSmartTable() {
		this.settingsSmartTable = {
			actions: false,
			columns: {
				level: {
					title: this.getTranslation('ORGANIZATIONS_PAGE.LEVEL'),
					type: 'custom',
					class: 'align-row',
					renderComponent: NotesWithTagsComponent
				}
			}
		};
	}
	async addEmployeeLevel(level: string) {
		if (level) {
			await this.employeeLevelService.create({
				level,
				organizationId: this.organizationId,
				tags: this.tags
			});

			this.toastrService.primary(
				this.getTranslation(
					'NOTES.ORGANIZATIONS.EDIT_ORGANIZATIONS_EMPLOYEE_LEVELS.ADD_EMPLOYEE_LEVEL',
					{
						name
					}
				),
				this.getTranslation('TOASTR.TITLE.SUCCESS')
			);
			this.loadEmployeeLevels();
			this.cancel();
		} else {
			this.toastrService.danger(
				this.getTranslation(
					'NOTES.ORGANIZATIONS.EDIT_ORGANIZATIONS_EMPLOYEE_LEVELS.INVALID_EMPLOYEE_LEVEL'
				),
				this.getTranslation(
					'TOASTR.MESSAGE.NEW_ORGANIZATION_EMPLOYEE_LEVEL_INVALID_NAME'
				)
			);
		}
	}

	async editEmployeeLevel(id: string, employeeLevelName: string) {
		const employeeLevel = {
			level: employeeLevelName,
			organizationId: this.organizationId,
			tags: this.tags
		};
		await this.employeeLevelService.update(id, employeeLevel);
		this.toastrService.primary(
			this.getTranslation('TOASTR.MESSAGE.EMPLOYEE_LEVEL_UPDATE'),
			this.getTranslation('TOASTR.TITLE.SUCCESS')
		);

		this.loadEmployeeLevels();
		this.cancel();
	}
	edit(employeeLevel: EmployeeLevelInput) {
		this.showAddCard = true;
		this.isGridEdit = true;
		this.selectedEmployeeLevel = employeeLevel;
		this.tags = employeeLevel.tags;
	}
	save(name: string) {
		console.log(this.isGridEdit);
		if (this.isGridEdit) {
			this.editEmployeeLevel(this.selectedEmployeeLevel.id, name);
		} else {
			this.addEmployeeLevel(name);
		}
	}
	async removeEmployeeLevel(id: string, name: string) {
		const result = await this.dialogService
			.open(DeleteConfirmationComponent, {
				context: {
					recordType: 'Employee level'
				}
			})
			.onClose.pipe(first())
			.toPromise();
		if (result) {
			await this.employeeLevelService.delete(id);
			this.toastrService.primary(
				this.getTranslation(
					'NOTES.ORGANIZATIONS.EDIT_ORGANIZATIONS_EMPLOYEE_LEVELS.REMOVE_EMPLOYEE_LEVEL',
					{
						name
					}
				),
				this.getTranslation('TOASTR.TITLE.SUCCESS')
			);
			this.loadEmployeeLevels();
		}
	}

	showEditCard(employeeLevel: EmployeeLevelInput) {
		this.tags = employeeLevel.tags;
		this.showEditDiv = true;
		this.selectedEmployeeLevel = employeeLevel;
	}

	cancel() {
		this.showEditDiv = false;
		this.showAddCard = false;
		this.selectedEmployeeLevel = null;
		this.isGridEdit = false;
		this.tags = [];
	}

	selectedTagsEvent(ev) {
		this.tags = ev;
	}
	_applyTranslationOnSmartTable() {
		this.translateService.onLangChange.subscribe(() => {
			this.loadSmartTable();
		});
	}
}
