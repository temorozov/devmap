import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-activity-calendar',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './activity-calendar.component.html',
    styleUrls: ['./activity-calendar.component.scss']
})
export class ActivityCalendarComponent implements OnChanges {
    @Input() activities: { date: string | Date; count: number }[] = [];

    weeks: { date: Date; count: number; isCurrentMonth: boolean }[][] = [];
    months: { label: string; colSpan: number }[] = [];

    ngOnChanges() {
        this.generateCalendar();
    }

    generateCalendar() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Target: Current Month
        const year = today.getFullYear();
        const monthIndex = today.getMonth();

        const firstDayOfMonth = new Date(year, monthIndex, 1);
        const lastDayOfMonth = new Date(year, monthIndex + 1, 0);

        // Map activities for fast lookup
        const activityMap = new Map<string, number>();
        this.activities.forEach(a => {
            const d = new Date(a.date);
            d.setHours(0, 0, 0, 0);
            activityMap.set(d.getTime().toString(), a.count);
        });

        this.weeks = [];
        let currentWeek: { date: Date; count: number; isCurrentMonth: boolean }[] = [];

        // Determine start date of the first week (could be from previous month)
        // assuming Monday as start of week for minimalism, or Sunday. Let's stick to Monday for a dev/minimal look.
        // JS getDay(): 0 = Sun, 1 = Mon...
        let startDayOffset = firstDayOfMonth.getDay() - 1;
        if (startDayOffset === -1) startDayOffset = 6; // Sunday becomes 6 if week starts on Mon

        const startDate = new Date(firstDayOfMonth);
        startDate.setDate(startDate.getDate() - startDayOffset);

        const iterDate = new Date(startDate);

        // Build weeks until we run past the end of the month
        // We ensure we at least complete the last week
        while (iterDate <= lastDayOfMonth || currentWeek.length > 0) {

            // If we've passed the month and the week is empty, we can stop
            if (iterDate > lastDayOfMonth && currentWeek.length === 0) {
                break;
            }

            const timeStr = iterDate.getTime().toString();
            const count = activityMap.get(timeStr) || 0;
            const isCurrentMonth = iterDate.getMonth() === monthIndex;

            currentWeek.push({
                date: new Date(iterDate),
                count,
                isCurrentMonth
            });

            if (currentWeek.length === 7) {
                this.weeks.push(currentWeek);
                currentWeek = [];
            }

            iterDate.setDate(iterDate.getDate() + 1);
        }

        // Set month header
        this.months = [{
            label: firstDayOfMonth.toLocaleString('default', { month: 'long', year: 'numeric' }),
            colSpan: 7
        }];
    }

    getColorClass(count: number): string {
        if (count === 0) return 'level-0';
        if (count <= 2) return 'level-1';
        if (count <= 5) return 'level-2';
        if (count <= 8) return 'level-3';
        return 'level-4';
    }
}
