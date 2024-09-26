import { Component, effect, inject, input, OnDestroy, OnInit } from '@angular/core';
import { Listing } from '../../landlord/model/listing.model';
import { BookingService } from '../service/booking.service';
import { ToastService } from '../../layout/toast.service';
import { AuthService } from '../../core/auth/auth.service';
import { Router } from '@angular/router';
import dayjs from 'dayjs';
import { BookedDatesDTOFromClient, CreateBooking } from '../model/booking.model';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {MessageModule} from "primeng/message";
import {CalendarModule} from "primeng/calendar";

@Component({
  selector: 'app-book-date',
  standalone: true,
  imports: [
    CurrencyPipe,
    FormsModule,
    MessageModule,
    CalendarModule],
  templateUrl: './book-date.component.html',
  styleUrl: './book-date.component.scss'
})
export class BookDateComponent implements OnInit,OnDestroy{

  listing = input.required<Listing>();
  listingPublicId = input.required<string>();

  bookingService = inject(BookingService);
  toastService = inject(ToastService);
  authService = inject(AuthService);
  router = inject(Router);

  bookingDates = new Array<Date>();
  totalPrice = 0;

  minDate = new Date();
  bookedDates = new Array<Date>();

  constructor(){
    this.listenToCheckAvailabileDate();
    this.listenToCreateBooking();
  }

  listenToCreateBooking() {
    effect(()=>{
      const createBookingState = this.bookingService.createBookingSig();
      if (createBookingState.status === "OK") {
        this.toastService.send({
          severity:"success", detail:"Booking created successfully", summary:"Success"
        });
        this.router.navigate(['/booking'])
      }else if (createBookingState.status === "ERROR") {
        this.toastService.send({
          severity:"error",detail:"Error when creating booking", summary:"Error"
        });
      }
    })
  }

  listenToCheckAvailabileDate() {
    effect(()=>{
      const checkAvailabilityState =  this.bookingService.checkAvailabilitySig();
      if (checkAvailabilityState.status === "OK") {
        this.bookedDates = this.mapBookedDatesToDate(checkAvailabilityState.value!);
      }else if (checkAvailabilityState.status === "ERROR") {
        this.toastService.send({
          severity:"error",detail:"Error when fetching the available dates", summary:"Error"
        });
      }
    });
  }

  private mapBookedDatesToDate(bookedDatesDTOFromClients: Array<BookedDatesDTOFromClient>): Array<Date> {
    const bookedDates = new Array<Date>();
    for (let bookedDate of bookedDatesDTOFromClients) {
      bookedDates.push(...this.getDatesInRange(bookedDate));
    }
    return bookedDates; 
  }

  private getDatesInRange(bookedDate: BookedDatesDTOFromClient) {
    const dates = new Array<Date>();

    let currentDate = bookedDate.startDate;
    while (currentDate <= bookedDate.endDate) {
      dates.push(currentDate.toDate());
      currentDate = currentDate.add(1, "day");
    }

    return dates;
  }


  ngOnDestroy(): void {
    this.bookingService.resetCreateBooking();
  }

  ngOnInit(): void {
    this.bookingService.checkAvailability(this.listingPublicId());
  }

  onDateChange(newBookingDates : Array<Date>){
    this.bookingDates = newBookingDates!;
    if (this.validateMakeBooking()) {
      const startBookingDateDayJs = dayjs(newBookingDates[0]);
      const endBookingDateDayJs = dayjs(newBookingDates[1]);
      this.totalPrice = endBookingDateDayJs.diff(startBookingDateDayJs, "days") * this.listing().price.value;
    }else{
      this.totalPrice = 0;
    }
  }

  validateMakeBooking() {
    return this.bookingDates.length === 2
      && this.bookingDates[0] !== null
      && this.bookingDates[1] !== null
      && this.bookingDates[0].getDate() !== this.bookingDates[1].getDate()
      && this.authService.isAuthenticated();
  }

  onNewBooking(){
    const newBooking : CreateBooking = {
      listingPublicId : this.listingPublicId(),
      startDate : this.bookingDates[0],
      endDate : this.bookingDates[1]
    }
    this.bookingService.create(newBooking);
  }

}
